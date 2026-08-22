import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"RimauLog",description:"A private workspace for managing multiple students, weekly mentoring progress and portfolio evidence.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
