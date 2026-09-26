import { createFileRoute } from "@tanstack/react-router";

import ChangePassword from "@/components/UserSettings/ChangePassword";
import DeleteAccount from "@/components/UserSettings/DeleteAccount";
import UserInformation from "@/components/UserSettings/UserInformation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Appearance } from "@/components/Common/Appearance";
import { useSidebar } from "@/components/ui/sidebar";

const tabsConfig = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
];

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
  head: () => ({
    meta: [
      {
        title: "Settings - FastAPI Template",
      },
    ],
  }),
});

function UserSettings() {
  const { logout, user: currentUser } = useAuth();
  const { isMobile } = useSidebar();

  const handleLogout = async () => {
    logout();
  };

  const finalTabs = currentUser?.is_superuser ? tabsConfig.slice(0, 3) : tabsConfig;

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>
        <div className="h-full">
          <Appearance />
        </div>
      </div>

      <Tabs defaultValue="my-profile">
        <TabsList>
          {finalTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {finalTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <tab.component />
          </TabsContent>
        ))}
      </Tabs>
      {isMobile && (
        <Button variant="destructive" className="mt-auto" onClick={handleLogout}>
          <LogOut />
          Log Out
        </Button>
      )}
    </div>
  );
}
