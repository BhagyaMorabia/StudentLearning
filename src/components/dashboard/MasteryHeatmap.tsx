"use client";

import React from "react";
import type { MasteryScore, Subtopic } from "@/lib/types";
import { Badge, Card, Progress } from "@/components/ui";
import { getMasteryLabel, cn } from "@/lib/utils";
import { getChapterMasteryPercentage } from "@/lib/mastery";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";

interface MasteryHeatmapProps {
  subtopics: Subtopic[];
  masteryScores: Record<string, MasteryScore>;
}

export function MasteryHeatmap({ subtopics, masteryScores }: MasteryHeatmapProps) {
  const subtopicIds = subtopics.map((s) => s.id);
  const overallPct = getChapterMasteryPercentage(Object.values(masteryScores), subtopicIds);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "mastered": return "bg-emerald-400";
      case "learning": return "bg-amber-400";
      case "weak": return "bg-red-400";
      default: return "bg-white/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall */}
      <Card className="!p-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Chapter Mastery</h3>
              <p className="text-xs text-[var(--text-tertiary)]">{subtopics.length} subtopics total</p>
            </div>
          </div>
          <span className="text-4xl font-black gradient-text">{overallPct}%</span>
        </div>
        <Progress
          value={overallPct}
          variant={overallPct >= 85 ? "success" : overallPct >= 50 ? "warning" : "brand"}
          size="lg"
        />
        <div className="flex items-center gap-6 mt-5 text-xs text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Mastered</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Learning</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Weak</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20" /> Not Started</span>
        </div>
      </Card>

      {/* Subtopics */}
      <div className="grid gap-3">
        {subtopics.map((st) => {
          const mastery = masteryScores[st.id];
          const status = mastery?.masteryStatus || "not_started";
          const score = mastery?.score || 0;

          return (
            <div
              key={st.id}
              className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-1.5 h-10 rounded-full", getStatusColor(status))} />
                  <div>
                    <p className="text-sm font-medium text-white">{st.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5 flex items-center gap-3">
                      {mastery ? (
                        <>
                          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{mastery.correctAttempts}/{mastery.totalAttempts}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mastery.streak} streak</span>
                        </>
                      ) : (
                        "Not attempted"
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {mastery && (
                    <div className="flex items-center gap-3">
                      <Progress value={score} variant={status === "mastered" ? "success" : status === "learning" ? "warning" : "danger"} size="sm" className="w-20" />
                      <span className="text-sm font-mono font-bold text-white w-10 text-right">{Math.round(score)}%</span>
                    </div>
                  )}
                  <Badge variant={status as "mastered" | "learning" | "weak" | "not_started"}>
                    {getMasteryLabel(status)}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
