import { SidebarAppearance } from "@/components/Common/Appearance"
import { Logo } from "@/components/Common/Logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import useAuth from "@/hooks/useAuth"
import type { Item } from "../NavigationLayout"
import { Main } from "./Main"
import { User } from "./User";

interface AppSidebarProps {
  items: Item[]
}

export function AppSidebar({ items }: AppSidebarProps) {
  const { user: currentUser } = useAuth()
  const { open } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={`border-b px-4 py-2 my-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center flex flex-row ${open ? "justify-between" : "justify-center"}`}
      >
        {open && <Logo variant="responsive" />}
        <SidebarTrigger className={open ? "text-muted-foreground" : ""} />
      </SidebarHeader>
      <SidebarContent>
        <Main items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarAppearance />
        <User user={currentUser} />
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
