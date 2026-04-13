"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadRoomsByCongregation } from "./actions";
import type { RoomOption } from "@/lib/dto";

interface RoomSelectProps {
  congregationId: number | undefined;
  value: number | undefined;
  onChange: (roomId: number | undefined) => void;
}

interface RoomsState {
  loadedForCongregation: number | undefined;
  rooms: RoomOption[];
}

export function RoomSelect({ congregationId, value, onChange }: RoomSelectProps) {
  const [state, setState] = useState<RoomsState>({
    loadedForCongregation: undefined,
    rooms: [],
  });

  // Derive loading: congregationId exists but hasn't been loaded yet
  const isLoading = !!congregationId && state.loadedForCongregation !== congregationId;

  useEffect(() => {
    if (!congregationId) return;

    let cancelled = false;

    loadRoomsByCongregation(congregationId)
      .then((data) => {
        if (!cancelled) {
          setState({ loadedForCongregation: congregationId, rooms: data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ loadedForCongregation: congregationId, rooms: [] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [congregationId]);

  if (!congregationId) {
    return (
      <Select disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a campus first" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={(val) => onChange(val ? Number(val) : undefined)}
      disabled={isLoading}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? "Loading rooms..." : "Select a room"} />
      </SelectTrigger>
      <SelectContent>
        {state.rooms.map((room) => (
          <SelectItem key={room.Room_ID} value={String(room.Room_ID)}>
            ({room.Building_Name}) {room.Room_Name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
