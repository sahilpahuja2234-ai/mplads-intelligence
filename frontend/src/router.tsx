import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboard';
import { ProjectsPage } from './pages/Projects';
import { MapIntelligencePage } from './pages/MapIntelligence';
import { AIAlertsPage } from './pages/AIAlerts';
import { ProjectInvestigationPage } from './pages/ProjectInvestigation';
import { DuplicatesPage } from './pages/Duplicates';
import { AnalyticsPage } from './pages/Analytics';
import { EarlyWarningPage } from './pages/EarlyWarning';
import { CompliancePage } from './pages/Compliance';
import { DemoScenariosPage } from './pages/DemoScenarios';
export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '/dashboard',
        element: <ExecutiveDashboardPage />,
    },
    {
        path: '/projects',
        element: <ProjectsPage />,
    },
    {
        path: '/projects/:id',
        element: <ProjectsPage />,
    },
    {
        path: '/map',
        element: <MapIntelligencePage />,
    },
    {
        path: '/alerts',
        element: <AIAlertsPage />,
    },
    {
        path: '/alerts/:id',
        element: <AIAlertsPage />,
    },
    {
        path: '/investigation',
        element: <Navigate to="/investigation/MPLADS-MH-2023-04521" replace />,
    },
    {
        path: '/investigation/:id',
        element: <ProjectInvestigationPage />,
    },
    {
        path: '/duplicates',
        element: <DuplicatesPage />,
    },
    {
        path: '/analytics',
        element: <AnalyticsPage />,
    },
    {
        path: '/early-warning',
        element: <EarlyWarningPage />,
    },
    {
        path: '/compliance',
        element: <CompliancePage />,
    },
    {
        path: '/demo',
        element: <DemoScenariosPage />,
    },
]);
