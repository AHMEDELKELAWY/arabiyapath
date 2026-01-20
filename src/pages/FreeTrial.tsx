import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/seo/SEOHead";
import { Loader2 } from "lucide-react";

export default function FreeTrial() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findFreeTrialUnit = async () => {
      try {
        // Find the first unit of the Beginner level (order_index = 1) from any dialect
        const { data: level, error: levelError } = await supabase
          .from("levels")
          .select("id, dialect_id")
          .eq("order_index", 1)
          .limit(1)
          .maybeSingle();

        if (levelError || !level) {
          console.error("Error finding beginner level:", levelError);
          navigate("/dialects");
          return;
        }

        // Find the first unit of this level
        const { data: unit, error: unitError } = await supabase
          .from("units")
          .select("id")
          .eq("level_id", level.id)
          .eq("order_index", 1)
          .maybeSingle();

        if (unitError || !unit) {
          console.error("Error finding first unit:", unitError);
          navigate(`/learn/level/${level.id}`);
          return;
        }

        // Find the first lesson of this unit
        const { data: lesson, error: lessonError } = await supabase
          .from("lessons")
          .select("id")
          .eq("unit_id", unit.id)
          .eq("order_index", 1)
          .maybeSingle();

        if (lessonError || !lesson) {
          // If no lesson found, navigate to unit overview
          navigate(`/learn/unit/${unit.id}`);
          return;
        }

        // Navigate directly to the first lesson
        navigate(`/learn/lesson/${lesson.id}`);
      } catch (error) {
        console.error("Error finding free trial content:", error);
        navigate("/dialects");
      }
    };

    findFreeTrialUnit();
  }, [navigate]);

  return (
    <>
      <SEOHead
        title="Start Free Arabic Lessons"
        description="Try ArabiyaPath free. No credit card required. Start learning Gulf, Egyptian, or Modern Standard Arabic with our first lesson today."
        canonicalPath="/free-trial"
      />
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">Loading your free trial...</p>
          </div>
        </div>
      </Layout>
    </>
  );
}
