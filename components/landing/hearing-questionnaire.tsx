"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ChevronRight, Check } from "lucide-react";

interface QuestionnaireProps {
  onComplete: (results: QuestionnaireResults) => void;
}

export interface QuestionnaireResults {
  difficulty: string;
  situations: string[];
  timeframe: string;
}

const questions = [
  {
    id: 1,
    question: "How would you describe your hearing difficulty?",
    multiple: false,
    options: [
      { value: "mild", label: "Mild - I miss some words occasionally" },
      { value: "moderate", label: "Moderate - I often ask people to repeat" },
      { value: "significant", label: "Significant - I struggle in most conversations" },
    ],
  },
  {
    id: 2,
    question: "In which situations do you experience difficulty? (Select all that apply)",
    multiple: true,
    options: [
      { value: "noisy", label: "Noisy environments (restaurants, crowds)" },
      { value: "phone", label: "Phone conversations" },
      { value: "tv", label: "Watching TV or movies" },
      { value: "family", label: "Family gatherings" },
      { value: "oneOnOne", label: "One-on-one conversations" },
    ],
  },
  {
    id: 3,
    question: "How soon would you like to address your hearing?",
    multiple: false,
    options: [
      { value: "asap", label: "As soon as possible" },
      { value: "month", label: "Within the next month" },
      { value: "exploring", label: "Just exploring options" },
    ],
  },
];

export function HearingQuestionnaire({ onComplete }: QuestionnaireProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});

  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === questions.length - 1;

  const handleAnswer = (value: string) => {
    if (currentQuestion.multiple) {
      const current = (answers[currentQuestion.id] as string[]) || [];
      const newAnswers = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [currentQuestion.id]: newAnswers });
    } else {
      setAnswers({ ...answers, [currentQuestion.id]: value });

      // Auto-advance for single-select questions
      setTimeout(() => {
        if (isLastStep) {
          handleComplete();
        } else {
          setCurrentStep(currentStep + 1);
        }
      }, 300);
    }
  };

  const handleComplete = () => {
    const results: QuestionnaireResults = {
      difficulty: answers[1] as string,
      situations: answers[2] as string[],
      timeframe: answers[3] as string,
    };
    onComplete(results);
  };

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const isAnswered = () => {
    const answer = answers[currentQuestion.id];
    if (currentQuestion.multiple) {
      return Array.isArray(answer) && answer.length > 0;
    }
    return !!answer;
  };

  return (
    <Card className="shadow-lg border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="text-xl">
          Step {currentStep + 1} of {questions.length}
        </CardTitle>
        <div className="flex gap-2 mt-3">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-colors ${
                idx <= currentStep ? "bg-white" : "bg-blue-400"
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold text-slate-800">
            {currentQuestion.question}
          </Label>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.multiple
                ? (answers[currentQuestion.id] as string[])?.includes(option.value)
                : answers[currentQuestion.id] === option.value;

              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={isSelected ? "text-blue-900 font-medium" : "text-slate-700"}>
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {currentQuestion.multiple && (
            <Button
              onClick={handleNext}
              disabled={!isAnswered()}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isLastStep ? "View Results" : "Continue"}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
