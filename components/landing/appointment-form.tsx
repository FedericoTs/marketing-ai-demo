"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AppointmentFormProps {
  recipientName: string;
  questionnaireResults?: {
    difficulty: string;
    situations: string[];
    timeframe: string;
  };
}

export function AppointmentForm({ recipientName, questionnaireResults }: AppointmentFormProps) {
  const [formData, setFormData] = useState({
    name: recipientName || "",
    phone: "",
    email: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Placeholder submission - no backend
    console.log("Appointment Request:", {
      ...formData,
      questionnaireResults,
    });

    setSubmitted(true);
    toast.success("Appointment request submitted successfully!");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (submitted) {
    return (
      <Card className="shadow-lg border-2 border-green-100">
        <CardContent className="pt-12 pb-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-slate-900 mb-2">
            Thank You, {recipientName}!
          </h3>
          <p className="text-slate-600 mb-4">
            Your appointment request has been received.
          </p>
          <p className="text-sm text-slate-500">
            A Miracle-Ear specialist will contact you within 24 hours to confirm your appointment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-2 border-blue-100">
      <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <CardTitle className="text-xl">Schedule Your Free Consultation</CardTitle>
        <p className="text-sm text-orange-50 mt-1">
          No obligation • Free hearing test • Expert guidance
        </p>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="preferredDate">
                <Calendar className="inline h-4 w-4 mr-1" />
                Preferred Date
              </Label>
              <Input
                id="preferredDate"
                name="preferredDate"
                type="date"
                value={formData.preferredDate}
                onChange={handleChange}
                required
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTime">
                <Clock className="inline h-4 w-4 mr-1" />
                Preferred Time
              </Label>
              <Input
                id="preferredTime"
                name="preferredTime"
                type="time"
                value={formData.preferredTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific concerns or questions..."
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
            size="lg"
          >
            Schedule My Free Consultation
          </Button>

          <p className="text-xs text-slate-500 text-center">
            By scheduling, you agree to be contacted by Miracle-Ear regarding your appointment.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
