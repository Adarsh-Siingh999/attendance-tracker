import { AppProvider, useApp } from "./context/AppContext.jsx";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Header } from "./components/layout/Header.jsx";
import { BottomNav } from "./components/layout/BottomNav.jsx";

// Page Views
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { SubjectsPage } from "./pages/SubjectsPage.jsx";
import { TimetablePage } from "./pages/TimetablePage.jsx";
import { CalendarPage } from "./pages/CalendarPage.jsx";
import { SkipSimulatorPage } from "./pages/SkipSimulatorPage.jsx";
import { ForecastPage } from "./pages/ForecastPage.jsx";
import { CalendarImportPage } from "./pages/CalendarImportPage.jsx";
import { PublicProfilePage } from "./pages/PublicProfilePage.jsx";
import { SettingsPage } from "./pages/SettingsPage.jsx";

import "./index.css";

function SaaSAppContent() {
  const { activeTab } = useApp();

  const renderActivePage = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardPage />;
      case "subjects":
        return <SubjectsPage />;
      case "timetable":
        return <TimetablePage />;
      case "calendar":
        return <CalendarPage />;
      case "skip":
        return <SkipSimulatorPage />;
      case "forecast":
        return <ForecastPage />;
      case "import":
        return <CalendarImportPage />;
      case "public":
        return <PublicProfilePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="saas-app-root">
      <Sidebar />
      <div className="saas-main-viewport">
        <Header />
        <main className="saas-page-content">{renderActivePage()}</main>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <SaaSAppContent />
    </AppProvider>
  );
}