import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="container mx-auto p-8 sm:p-20 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">CalvaryToolsNext</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Template Tool</CardTitle>
            <CardDescription>
              An example of an approach to build tools for MP
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/tools/template">
              <Button className="w-full">View Demo</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Team Wizard</CardTitle>
            <CardDescription>
              Create and manage teams in Ministry Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/tools/teamwizard">
              <Button className="w-full">Open Tool</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Group Wizard</CardTitle>
            <CardDescription>
              Create and manage groups in Ministry Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/tools/groupwizard">
              <Button className="w-full">Open Tool</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Template Editor</CardTitle>
            <CardDescription>
              Create and edit templates in Ministry Platform
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/tools/templateeditor">
              <Button className="w-full">Open Tool</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Training Assignment</CardTitle>
            <CardDescription>
              Assign volunteer training to selected volunteer applications
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Link href="/tools/trainingtool">
              <Button className="w-full">Open Tool</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
