import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import { DashboardSidebar } from "@/modules/dashboard/components/DashboardSidebar";


export default async function DashboardLayout({
    children
}: {
    children: React.ReactNode
}) {

    const playgroundData = await getAllPlaygroundForUser()

    const technologyIconMap : Record<string,string> = {
        REACT:"Zap",
        NEXTJS:"Lightbulb",
        EXPRESS:"Database",
        VUE:"Compass",
        HONO:"FlameIcon",
        ANGULAR:"Terminal"
    }

    const formattedPlaygroundData = playgroundData?.map((item) => ({
        id:item.id,
        name:item.title,
        starred:item.Starmark?.[0]?.isMarked || false,
        icon:technologyIconMap[item.template] || "Code2"
    }))

    return(
        <SidebarProvider className="flex min-h-screen w-full overflow-x-hidden">
        {/* Dashboard Sidebar */}
        {/* @ts-expect-error */}
        <DashboardSidebar initialPlaygroundData={formattedPlaygroundData} />
        <main className="flex-1">
            {children}
        </main>
    </SidebarProvider>
    )

}