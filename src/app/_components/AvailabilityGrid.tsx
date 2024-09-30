"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import React from "react";

export default function AvailabilityGrid({ userId }: { userId: string }) {
  const [availabilities, setAvailabilities] = useState<{ start: Date; end: Date }[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date>(getMonday(new Date()));
  const supabase = createClientComponentClient();

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const timeSlots = Array.from({ length: 96 }, (_, i) => {
    const hours = Math.floor(i / 4);
    const minutes = (i % 4) * 15;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  });

  function getMonday(d: Date) {
    d = new Date(d);
    var day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustement si dimanche
    return new Date(d.setDate(diff));
  }

  useEffect(() => {
    fetchAvailabilities();
  }, [selectedWeek]);

  const fetchAvailabilities = async () => {
    const weekEnd = new Date(selectedWeek);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data, error } = await supabase
      .from("availabilities")
      .select("start_time, end_time")
      .eq("user_id", userId)
      .gte("start_time", selectedWeek.toISOString())
      .lt("start_time", weekEnd.toISOString());

    if (error) {
      console.error("Erreur lors de la récupération des disponibilités:", error);
      return;
    }

    const availList = data.map((a: any) => ({
      start: new Date(a.start_time),
      end: new Date(a.end_time),
    }));
    setAvailabilities(availList);
  };

  const areSlotsAdjacent = (slot1: Date, slot2: Date) => {
    return Math.abs(slot1.getTime() - slot2.getTime()) === 15 * 60 * 1000;
  };

  const toggleAvailability = async (dayIndex: number, timeIndex: number) => {
    const date = new Date(selectedWeek);
    date.setDate(date.getDate() + dayIndex);
    const timeSlot = timeSlots[timeIndex];
    if (timeSlot) {
      const [hours, minutes] = timeSlot.split(":").map(Number);
      if (hours !== undefined && minutes !== undefined) {
        date.setHours(hours, minutes, 0, 0);

        // Créer une copie des disponibilités pour la mettre à jour
        let updatedAvailabilities = [...availabilities];
        let changed = false;

        // Parcourir les disponibilités avec une boucle inversée pour gérer les suppressions
        for (let i = updatedAvailabilities.length - 1; i >= 0; i--) {
          const availability = updatedAvailabilities[i];
          if (availability && date >= availability.start && date < availability.end) {
            // Si le créneau est déjà dans une plage, le retirer
            const duration = availability.end.getTime() - availability.start.getTime();
            if (duration === 15 * 60 * 1000) {
              // Supprimer la plage entière
              updatedAvailabilities.splice(i, 1);
              await supabase.from("availabilities").delete().match({
                user_id: userId,
                start_time: availability.start.toISOString(),
              });
            } else if (availability.start.getTime() === date.getTime()) {
              // Retirer le début de la plage
              const newStart = new Date(availability.start.getTime() + 15 * 60 * 1000);
              await supabase
                .from("availabilities")
                .update({ start_time: newStart.toISOString() })
                .match({ user_id: userId, start_time: availability.start.toISOString() });
              availability.start = newStart;
            } else if (availability.end.getTime() - 15 * 60 * 1000 === date.getTime()) {
              // Retirer la fin de la plage
              const newEnd = new Date(availability.end.getTime() - 15 * 60 * 1000);
              await supabase
                .from("availabilities")
                .update({ end_time: newEnd.toISOString() })
                .match({ user_id: userId, start_time: availability.start.toISOString() });
              availability.end = newEnd;
            } else {
              // Diviser la plage en deux
              const newAvailability = {
                start: new Date(date.getTime() + 15 * 60 * 1000),
                end: availability.end,
              };
              await supabase
                .from("availabilities")
                .update({ end_time: date.toISOString() })
                .match({ user_id: userId, start_time: availability.start.toISOString() });
              await supabase.from("availabilities").insert({
                user_id: userId,
                start_time: newAvailability.start.toISOString(),
                end_time: newAvailability.end.toISOString(),
              });
              availability.end = date;
              updatedAvailabilities.push(newAvailability);
            }
            changed = true;
            break;
          }
        }

        if (!changed) {
          // Ajouter un nouveau créneau ou étendre une plage existante
          let merged = false;

          for (let i = 0; i < updatedAvailabilities.length; i++) {
            const availability = updatedAvailabilities[i];
            if (!availability) continue;

            if (areSlotsAdjacent(availability.end, date)) {
              // Étendre la fin de la plage
              const oldEnd = availability.end;
              availability.end = new Date(availability.end.getTime() + 15 * 60 * 1000);
              await supabase
                .from("availabilities")
                .update({ end_time: availability.end.toISOString() })
                .match({ user_id: userId, start_time: availability.start.toISOString() });
              merged = true;
              break;
            } else if (areSlotsAdjacent(date, availability.start)) {
              // Étendre le début de la plage
              const oldStart = availability.start;
              availability.start = new Date(availability.start.getTime() - 15 * 60 * 1000);
              await supabase
                .from("availabilities")
                .update({ start_time: availability.start.toISOString() })
                .match({ user_id: userId, start_time: oldStart.toISOString() });
              merged = true;
              break;
            }
          }

          if (!merged) {
            // Créer une nouvelle plage
            const newAvailability = {
              start: date,
              end: new Date(date.getTime() + 15 * 60 * 1000),
            };
            await supabase.from("availabilities").insert({
              user_id: userId,
              start_time: newAvailability.start.toISOString(),
              end_time: newAvailability.end.toISOString(),
            });
            updatedAvailabilities.push(newAvailability);
          }
        }

        // Mettre à jour l'état en filtrant les éventuels undefined
        setAvailabilities(updatedAvailabilities.filter((a) => a));
      }
    }
  };

  const changeWeek = (direction: number) => {
    const newWeek = new Date(selectedWeek);
    newWeek.setDate(newWeek.getDate() + 7 * direction);
    setSelectedWeek(getMonday(newWeek));
  };

  return (
    <div className="p-4 bg-muted/40">
      <div className="max-w-6xl w-full mx-auto grid gap-6">
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => changeWeek(-1)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Semaine précédente
          </button>
          <span>
            {selectedWeek.toLocaleDateString()} -{" "}
            {new Date(selectedWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </span>
          <button
            onClick={() => changeWeek(1)}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Semaine suivante
          </button>
        </div>
        <div className="grid grid-cols-8 gap-1 text-sm font-medium">
          <div className="col-span-1 flex items-center justify-center h-12 bg-card rounded-md">
            Heure
          </div>
          {days.map((day) => (
            <div
              key={day}
              className="col-span-1 flex items-center justify-center h-12 bg-card rounded-md"
            >
              {day}
            </div>
          ))}
          {timeSlots.map((time, timeIndex) => (
            <React.Fragment key={timeIndex}>
              <div className="col-span-1 flex items-center justify-center h-12 bg-card rounded-md">
                {time}
              </div>
              {days.map((day, dayIndex) => {
                const date = new Date(selectedWeek);
                date.setDate(date.getDate() + dayIndex);
                const [hours, minutes] = time.split(":").map(Number);
                if (hours !== undefined && minutes !== undefined) {
                  date.setHours(hours, minutes, 0, 0);
                  const isAvailable = availabilities.some(
                    (a) => date >= a.start && date < a.end
                  );
                  return (
                    <div
                      key={`${dayIndex}-${timeIndex}`}
                      className={`col-span-1 flex items-center justify-center h-12 bg-card rounded-md cursor-pointer transition-colors ${
                        isAvailable ? "bg-green-500 text-primary-foreground" : "hover:bg-muted"
                      }`}
                      onClick={() => toggleAvailability(dayIndex, timeIndex)}
                    />
                  );
                }
                return null;
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
