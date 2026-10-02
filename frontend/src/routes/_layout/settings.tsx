import { createFileRoute } from "@tanstack/react-router"
import { LogOut } from "lucide-react"
import { Appearance } from "@/components/Common/Appearance"
import { Title } from "@/components/Title"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import useAuth from "@/hooks/useAuth"

const tabsConfig = [
  { value: "my-profile", title: "My profile", component: UserInformation },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
  head: () => ({
    meta: [
      {
        title: "Settings",
      },
    ],
  }),
})

function UserSettings() {
  const { logout, user: currentUser } = useAuth()
  const isMobile = useIsMobile()

  const handleLogout = async () => {
    logout()
  }

  const finalTabs = currentUser?.is_superuser
    ? tabsConfig.slice(0, 3)
    : tabsConfig

  if (!currentUser) {
    return null
  }

  return (
    <div className="flex flex-col h-full mb-2">
      <div className="flex items-center justify-between">
        <Title>Settings</Title>
        {isMobile && (
          <div className="pb-6">
            <Appearance />
          </div>
        )}
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
        <Button
          variant="destructive"
          className="mt-auto"
          onClick={handleLogout}
        >
          <LogOut />
          Log Out
        </Button>
      )}
    </div>
  )
}
