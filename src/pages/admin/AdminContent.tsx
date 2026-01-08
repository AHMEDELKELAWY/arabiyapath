import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialectsTab } from "@/components/admin/content/DialectsTab";
import { LevelsTab } from "@/components/admin/content/LevelsTab";
import { UnitsTab } from "@/components/admin/content/UnitsTab";
import { LessonsTab } from "@/components/admin/content/LessonsTab";
import { QuizzesTab } from "@/components/admin/content/QuizzesTab";

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState("dialects");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground">Manage dialects, levels, units, and lessons</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 max-w-xl">
            <TabsTrigger value="dialects">Dialects</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          </TabsList>

          <TabsContent value="dialects" className="mt-6">
            <DialectsTab />
          </TabsContent>

          <TabsContent value="levels" className="mt-6">
            <LevelsTab />
          </TabsContent>

          <TabsContent value="units" className="mt-6">
            <UnitsTab />
          </TabsContent>

          <TabsContent value="lessons" className="mt-6">
            <LessonsTab />
          </TabsContent>

          <TabsContent value="quizzes" className="mt-6">
            <QuizzesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
