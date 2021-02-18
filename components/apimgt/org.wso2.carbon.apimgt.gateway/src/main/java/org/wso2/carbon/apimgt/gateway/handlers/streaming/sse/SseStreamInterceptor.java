/*
 *  Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.wso2.carbon.apimgt.gateway.handlers.streaming.sse;

import org.apache.axiom.util.UIDGenerator;
import org.apache.axis2.context.MessageContext;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.synapse.transport.passthru.DefaultStreamInterceptor;
import org.apache.synapse.transport.passthru.PassThroughConstants;
import org.json.JSONObject;
import org.wso2.carbon.apimgt.common.gateway.analytics.collectors.AnalyticsDataProvider;
import org.wso2.carbon.apimgt.common.gateway.analytics.collectors.impl.GenericRequestDataCollector;
import org.wso2.carbon.apimgt.gateway.handlers.Utils;
import org.wso2.carbon.apimgt.gateway.handlers.analytics.SynapseAnalyticsDataProvider;
import org.wso2.carbon.apimgt.impl.APIConstants;

import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.wso2.carbon.apimgt.gateway.handlers.streaming.sse.SseApiConstants.SSE_THROTTLE_DTO;
import static org.wso2.carbon.apimgt.gateway.handlers.streaming.sse.SseUtils.isThrottled;

/**
 * This is used for handling throttling, and analytics event publishing of sse apis (subset of streaming apis).
 */
public class SseStreamInterceptor extends DefaultStreamInterceptor {

    private static final Log log = LogFactory.getLog(SseStreamInterceptor.class);
    private static final String SSE_STREAM_DELIMITER = "\n\n";
    private static final int DEFAULT_NO_OF_THROTTLE_PUBLISHER_EXECUTORS = 100;
    private String charset = StandardCharsets.UTF_8.name();
    private ExecutorService throttlePublisherService;
    private int noOfExecutorThreads = DEFAULT_NO_OF_THROTTLE_PUBLISHER_EXECUTORS;

    public SseStreamInterceptor() {
        throttlePublisherService = Executors.newFixedThreadPool(noOfExecutorThreads);
    }

    @Override
    public boolean interceptTargetResponse(MessageContext axisCtx) {
        Object artifactType = axisCtx.getProperty(PassThroughConstants.SYNAPSE_ARTIFACT_TYPE);
        return APIConstants.API_TYPE_SSE.equals(artifactType);
    }

    @Override
    public boolean targetResponse(ByteBuffer buffer, MessageContext axis2Ctx) {
        int eventCount = getEventCount(buffer);
        if (log.isDebugEnabled()) {
            log.debug("No. of events =" + eventCount);
        }
        if (eventCount > 0) {
            return handleThrottlingAndAnalytics(eventCount, axis2Ctx);
        }
        return true;
    }

    @SuppressWarnings("unused")
    public void setNoOfExecutorThreads(int executorThreads) {
        this.noOfExecutorThreads = executorThreads;
    }

    private int getEventCount(ByteBuffer stream) {
        Charset charsetValue = Charset.forName(this.charset);
        String text = charsetValue.decode(stream).toString();
        return StringUtils.countMatches(text, SSE_STREAM_DELIMITER);
    }

    private boolean handleThrottlingAndAnalytics(int eventCount, MessageContext axi2Ctx) {

        Object throttleObject = axi2Ctx.getProperty(SSE_THROTTLE_DTO);
        if (throttleObject != null) {
            String messageId = UIDGenerator.generateURNString();
            ThrottleInfo throttleInfo = (ThrottleInfo) throttleObject;
            String remoteIP = throttleInfo.getRemoteIp();
            JSONObject propertiesMap = new JSONObject();
            Utils.setRemoteIp(propertiesMap, remoteIP);
            boolean isThrottled = isThrottled(throttleInfo.getSubscriberTenantDomain(),
                                              throttleInfo.getResourceLevelThrottleKey(),
                                              throttleInfo.getSubscriptionLevelThrottleKey(),
                                              throttleInfo.getApplicationLevelThrottleKey());
            if (isThrottled) {
                log.warn("Request is throttled out");
                return false;
            }
            publishAnalyticsData();
            throttlePublisherService.execute(
                    () -> SseUtils.publishNonThrottledEvent(eventCount, messageId, throttleInfo, propertiesMap));
            return true;
        } else {
            log.error("Throttle object cannot be null.");
        }
        return true;
    }

    private void publishAnalyticsData(){
        boolean somedata = false;
        AnalyticsDataProvider provider = new SseEventDataProvider(){

            @Override
            public boolean isFaultRequest() {
                return somedata;
            }
        };
        GenericRequestDataCollector dataCollector = new GenericRequestDataCollector(provider);
        dataCollector.collectData();
    }

    public void setCharset(String charset) {
        this.charset = charset;
    }
}
