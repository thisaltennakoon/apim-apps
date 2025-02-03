/* eslint-disable */
/*
 * Copyright (c) 2025, WSO2 LLC. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { Grid, Card, CardContent, Typography, Chip, Box, Tabs, Tab, Collapse, IconButton } from '@mui/material';
import ReportIcon from '@mui/icons-material/Report';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LabelIcon from '@mui/icons-material/Label';
import RuleIcon from '@mui/icons-material/Rule';
import ListBase from 'AppComponents/AdminPages/Addons/ListBase';
import GovernanceAPI from 'AppData/GovernanceAPI';
import { useIntl } from 'react-intl';

// TODO: Improve the component
export default function RuleViolationSummary({ artifactId }) {
    const intl = useIntl();
    const [selectedTab, setSelectedTab] = React.useState(0);
    const [expandedItems, setExpandedItems] = React.useState([]);

    // To store expanded state per tab (TODO: Remove this and simplify the component)
    const [expandedCards, setExpandedCards] = React.useState({
        errors: {},
        warnings: {},
        info: {},
        passed: {}
    });

    // TODO: Optimize + simplify
    const apiCall = () => {
        const restApi = new GovernanceAPI();
        return restApi.getComplianceByAPIId(artifactId)
            .then((response) => {
                // Get unique ruleset IDs from all policies
                const rulesetIds = [...new Set(
                    response.body.governedPolicies.flatMap(policy =>
                        policy.rulesetValidationResults.map(result => result.id)
                    )
                )];

                // Get validation results for each ruleset
                return Promise.all(
                    rulesetIds.map(rulesetId =>
                        restApi.getRulesetValidationResultsByAPIId(artifactId, rulesetId)
                            .then((result) => result.body)
                    )
                ).then((rulesets) => {
                    // Create rulesets array with severities catagorized
                    const rulesetCategories = rulesets.map(ruleset => ({
                        rulesetName: ruleset.name,
                        error: ruleset.violatedRules.filter(rule => rule.severity === 'ERROR'),
                        warn: ruleset.violatedRules.filter(rule => rule.severity === 'WARN'),
                        info: ruleset.violatedRules.filter(rule => rule.severity === 'INFO'),
                        passed: ruleset.followedRules
                    }));

                    // Group by severity level
                    const severityGroups = {
                        errors: [],
                        warnings: [],
                        info: [],
                        passed: []
                    };

                    rulesetCategories.forEach(ruleset => {
                        if (ruleset.error.length > 0) {
                            severityGroups.errors.push({
                                rulesetName: ruleset.rulesetName,
                                // tag: ruleset.tag,
                                rules: ruleset.error
                            });
                        }
                        if (ruleset.warn.length > 0) {
                            severityGroups.warnings.push({
                                rulesetName: ruleset.rulesetName,
                                // tag: ruleset.tag,
                                rules: ruleset.warn
                            });
                        }
                        if (ruleset.info.length > 0) {
                            severityGroups.info.push({
                                rulesetName: ruleset.rulesetName,
                                // tag: ruleset.tag,
                                rules: ruleset.info
                            });
                        }
                        if (ruleset.passed.length > 0) {
                            severityGroups.passed.push({
                                rulesetName: ruleset.rulesetName,
                                // tag: ruleset.tag,
                                rules: ruleset.passed
                            });
                        }
                    });

                    return severityGroups;
                });
            })
            .catch((error) => {
                console.error('Error fetching ruleset adherence data:', error);
                return {
                    errors: [],
                    warnings: [],
                    info: [],
                    passed: []
                };
            });
    };

    // Remove the mock complianceData and use state instead
    const [complianceData, setComplianceData] = React.useState({
        errors: [],
        warnings: [],
        info: [],
        passed: []
    });

    React.useEffect(() => {
        apiCall().then(setComplianceData);
    }, [artifactId]);

    const handleTabChange = (e, newValue) => {
        setSelectedTab(newValue);
        setExpandedItems([]); // Reset expanded items when tab changes
    };

    const handleExpandClick = (index) => {
        setExpandedItems(prev => {
            const isExpanded = prev.includes(index);
            return isExpanded
                ? prev.filter(i => i !== index)
                : [...prev, index];
        });
    };

    const getRuleData = (rules) => {
        return Promise.resolve(
            rules.map(rule => [rule.name, rule.violatedPath, rule.message])
        );
    };

    // Add new function for passed rules data
    const getPassedRuleData = (rules) => {
        return Promise.resolve(
            rules.map(rule => [rule.name, rule.description])
        );
    };

    const ruleColumProps = [
        {
            name: 'name',
            label: intl.formatMessage({
                id: 'Governance.Overview.APICompliance.RuleViolation.column.rule',
                defaultMessage: 'Rule',
            }),
            options: {
                customBodyRender: (value) => (
                    <Typography variant="body2">{value}</Typography>
                ),
            },
        },
        {
            name: 'violatedPath',
            label: intl.formatMessage({
                id: 'Governance.Overview.APICompliance.RuleViolation.column.path',
                defaultMessage: 'Path',
            }),
            options: {
                customBodyRender: (value) => (
                    <Typography variant="body2">{value}</Typography>
                ),
            },
        },
        {
            name: 'message',
            label: intl.formatMessage({
                id: 'Governance.Overview.APICompliance.RuleViolation.column.message',
                defaultMessage: 'Message',
            }),
            options: {
                customBodyRender: (value) => (
                    <Typography variant="body2">{value}</Typography>
                ),
            },
        },
    ];

    // Add new column props for passed rules
    const passedRuleColumnProps = [
        {
            name: 'name',
            label: intl.formatMessage({
                id: 'Governance.Overview.APICompliance.RuleViolation.column.rule',
                defaultMessage: 'Rule',
            }),
            options: {
                customBodyRender: (value) => (
                    <Typography variant="body2">{value}</Typography>
                ),
            },
        },
        {
            name: 'description',
            label: intl.formatMessage({
                id: 'Governance.Overview.APICompliance.RuleViolation.column.description',
                defaultMessage: 'Description',
            }),
            options: {
                customBodyRender: (value) => (
                    <Typography variant="body2">{value}</Typography>
                ),
            },
        },
    ];

    const renderComplianceCards = (rulesets, isPassed = false) => {
        return (
            <>
                <Grid container spacing={2}>
                    {rulesets.map((item, index) => (
                        <Grid item xs={12} key={index}>
                            <Card>
                                <CardContent sx={{
                                    py: 0.5,
                                    '&:last-child': { pb: 0.5 },
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <LabelIcon sx={{ fontSize: 16, mr: 1 }} />
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                {/* {item.provider} /  */}
                                                {item.rulesetName} ({item.rules.length})
                                            </Typography>
                                            {/* <Chip
                                                label={item.tag}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            /> */}
                                        </Box>
                                        <IconButton
                                            onClick={() => handleExpandClick(index)}
                                            aria-expanded={expandedItems.includes(index)}
                                            aria-label="show more"
                                        >
                                            {expandedItems.includes(index) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                        </IconButton>
                                    </Box>
                                </CardContent>
                                <Collapse in={expandedItems.includes(index)} timeout="auto" unmountOnExit>
                                    <CardContent sx={{
                                        pt: 0,
                                        '& .MuiTableCell-footer': {
                                            border: 0
                                        },
                                    }}>
                                        <ListBase
                                            columProps={isPassed ? passedRuleColumnProps : ruleColumProps}
                                            apiCall={() => isPassed ? getPassedRuleData(item.rules) : getRuleData(item.rules)}
                                            searchProps={false}
                                            addButtonProps={false}
                                            showActionColumn={false}
                                            useContentBase={false}
                                            emptyBoxProps={{
                                                content: 'There are no rules to display',
                                            }}
                                            options={{
                                                elevation: 0,
                                                setTableProps: () => ({
                                                    size: 'small',
                                                }),
                                                rowsPerPage: 5,
                                            }}
                                        />
                                    </CardContent>
                                </Collapse>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </>
        );
    };

    // Add this new function to calculate total rules
    const getTotalRuleCount = (rulesets) => {
        return rulesets.reduce((sum, ruleset) => sum + ruleset.rules.length, 0);
    };

    const renderEmptyContent = (message) => (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 3
            }}
        >
            <RuleIcon
                sx={{
                    fontSize: 60,
                    color: 'action.disabled',
                    mb: 2
                }}
            />
            <Typography
                variant="h6"
                color="text.secondary"
                gutterBottom
                sx={{ fontWeight: 'medium' }}
            >
                {message}
            </Typography>
        </Box>
    );

    const getEmptyMessage = (tabIndex) => {
        switch (tabIndex) {
            case 0:
                return intl.formatMessage({
                    id: 'Governance.Overview.APICompliance.RuleViolation.empty.errors',
                    defaultMessage: 'No Error violations found',
                });
            case 1:
                return intl.formatMessage({
                    id: 'Governance.Overview.APICompliance.RuleViolation.empty.warnings',
                    defaultMessage: 'No Warning violations found',
                });
            case 2:
                return intl.formatMessage({
                    id: 'Governance.Overview.APICompliance.RuleViolation.empty.info',
                    defaultMessage: 'No Info violations found',
                });
            case 3:
                return intl.formatMessage({
                    id: 'Governance.Overview.APICompliance.RuleViolation.empty.passed',
                    defaultMessage: 'No Passed rules found',
                });
            default:
                return '';
        }
    };

    return (
        <>
            <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    mb: 2,
                    minHeight: '40px',
                    '& .MuiTab-root': {
                        color: 'text.secondary',
                        minHeight: '40px',
                        padding: '6px 12px',
                        '&.Mui-selected': {
                            color: (theme) => {
                                switch (selectedTab) {
                                    case 0:
                                        return theme.palette.error.main;
                                    case 1:
                                        return theme.palette.warning.main;
                                    case 2:
                                        return theme.palette.info.main;
                                    case 3:
                                        return theme.palette.success.main;
                                    default:
                                        return theme.palette.primary.main;
                                }
                            }
                        }
                    }
                }}
                TabIndicatorProps={{
                    sx: {
                        backgroundColor: (theme) => {
                            switch (selectedTab) {
                                case 0:
                                    return theme.palette.error.main;
                                case 1:
                                    return theme.palette.warning.main;
                                case 2:
                                    return theme.palette.info.main;
                                case 3:
                                    return theme.palette.success.main;
                                default:
                                    return theme.palette.primary.main;
                            }
                        }
                    }
                }}
            >
                <Tab
                    icon={<ReportIcon color="error" />}
                    iconPosition="start"
                    label={intl.formatMessage({
                        id: 'Governance.Overview.APICompliance.RuleViolation.tab.errors',
                        defaultMessage: 'Errors ({count})',
                    }, { count: getTotalRuleCount(complianceData.errors) })}
                />
                <Tab
                    icon={<WarningIcon color="warning" />}
                    iconPosition="start"
                    label={intl.formatMessage({
                        id: 'Governance.Overview.APICompliance.RuleViolation.tab.warnings',
                        defaultMessage: 'Warnings ({count})',
                    }, { count: getTotalRuleCount(complianceData.warnings) })}
                />
                <Tab
                    icon={<InfoIcon color="info" />}
                    iconPosition="start"
                    label={intl.formatMessage({
                        id: 'Governance.Overview.APICompliance.RuleViolation.tab.info',
                        defaultMessage: 'Info ({count})',
                    }, { count: getTotalRuleCount(complianceData.info) })}
                />
                <Tab
                    icon={<CheckCircleIcon color="success" />}
                    iconPosition="start"
                    label={intl.formatMessage({
                        id: 'Governance.Overview.APICompliance.RuleViolation.tab.passed',
                        defaultMessage: 'Passed ({count})',
                    }, { count: getTotalRuleCount(complianceData.passed) })}
                />
            </Tabs>
            {selectedTab === 0 && (
                complianceData.errors.length > 0
                    ? renderComplianceCards(complianceData.errors)
                    : renderEmptyContent(getEmptyMessage(0))
            )}
            {selectedTab === 1 && (
                complianceData.warnings.length > 0
                    ? renderComplianceCards(complianceData.warnings)
                    : renderEmptyContent(getEmptyMessage(1))
            )}
            {selectedTab === 2 && (
                complianceData.info.length > 0
                    ? renderComplianceCards(complianceData.info)
                    : renderEmptyContent(getEmptyMessage(2))
            )}
            {selectedTab === 3 && (
                complianceData.passed.length > 0
                    ? renderComplianceCards(complianceData.passed, true)
                    : renderEmptyContent(getEmptyMessage(3))
            )}
        </>
    );
}
