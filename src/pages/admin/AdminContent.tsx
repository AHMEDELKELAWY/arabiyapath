import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminScopePicker } from "@/components/admin/AdminScopePicker";
import { useAdminLearnScope } from "@/components/admin/AdminScopeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DialectsTab } from "@/components/admin/content/DialectsTab";
import { LevelsTab } from "@/components/admin/content/LevelsTab";
import { UnitsTab } from "@/components/admin/content/UnitsTab";
import { LessonsTab } from "@/components/admin/content/LessonsTab";
import { QuizzesTab } from "@/components/admin/content/QuizzesTab";
import { ListeningTab } from "@/components/admin/content/ListeningTab";

export default function AdminContent() {
  const [activeTab, setActiveTab] = useState("dialects");
  const scope = useAdminLearnScope();
  const scopedTab =
    activeTab === "units" ||
    activeTab === "lessons" ||
    activeTab === "quizzes" ||
    activeTab === "listening";


  return (
    <AdminLayout>
      {scopedTab && (
        <AdminScopePicker
          scope="learn"
          allowAllUnits
          hint={
            scope.currentLevel && scope.currentUnit
              ? `Working in: ${scope.currentLevel.label} / ${scope.currentUnit.title}`
              : scope.currentLevel
                ? `Filtering ${activeTab} in ${scope.currentLevel.label}. Pick a unit to narrow further.`
                : "Pick a Course / Level to keep your selection while managing units, lessons, and quizzes."
          }
        />
      )}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Content Management</h1>
          <p className="text-muted-foreground">Manage dialects, levels, units, and lessons</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 max-w-2xl">
            <TabsTrigger value="dialects">Dialects</TabsTrigger>
            <TabsTrigger value="levels">Levels</TabsTrigger>
            <TabsTrigger value="units">Units</TabsTrigger>
            <TabsTrigger value="lessons">Lessons</TabsTrigger>
            <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
            <TabsTrigger value="listening">Listening</TabsTrigger>

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

          <TabsContent value="listening" className="mt-6">
            <ListeningTab />
          </TabsContent>

        </Tabs>
      </div>
    </AdminLayout>
  );
}
