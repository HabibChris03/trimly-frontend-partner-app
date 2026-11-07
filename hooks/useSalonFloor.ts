import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { barberService } from "@/services/barberService";

export interface SalonFloorChair {
  chairNumber: number;
  barberId: number | string;
  barberName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: "Active" | "On Break" | "Off Duty" | "Suspended";
  avatar_url?: string | null;
  isLead?: boolean;
  services?: any[];
}

interface UseSalonFloorOptions {
  enabled?: boolean;
}

export function useSalonFloor(options?: UseSalonFloorOptions) {
  const enabled = options?.enabled ?? true;
  const { user } = useAuth();
  const salonId = user?.id ? Number(user.id) : 0;

  const [staffList, setStaffList] = useState<any[]>([]);
  const [capacity, setCapacity] = useState<number>(
    Number(user?.capacity || user?.working_chairs || 1)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const refresh = useCallback(async () => {
    if (!enabled || !salonId) return;
    setIsLoading(true);
    try {
      const [staffRes, capRes] = await Promise.all([
        barberService.listSalonStaff(salonId).catch(() => null),
        barberService.getSalonCapacity(salonId).catch(() => null),
      ]);

      if (Array.isArray(staffRes)) {
        setStaffList(staffRes);
      }

      if (capRes && typeof capRes.capacity === "number" && capRes.capacity > 0) {
        setCapacity(capRes.capacity);
      } else if (Array.isArray(staffRes) && staffRes.length > 0) {
        setCapacity(staffRes.length);
      } else if (user?.capacity || user?.working_chairs) {
        setCapacity(Number(user.capacity || user.working_chairs || 1));
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, salonId, user?.capacity, user?.working_chairs]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (enabled && salonId) {
        refresh();
      }
    }, [enabled, salonId, refresh])
  );

  const chairs = useMemo<SalonFloorChair[]>(() => {
    if (!salonId) return [];
    const list: SalonFloorChair[] = [];

    const ownerInStaffList = staffList.some(
      (m) => String(m.id) === String(salonId)
    );
    const shouldIncludeOwnerChair =
      !ownerInStaffList &&
      (Boolean((user as any)?.is_lead) || staffList.length === 0);

    if (shouldIncludeOwnerChair) {
      const isLeadSuspended =
        (user as any)?.staff_status === "Suspended" ||
        (user as any)?.account_status === "suspended";
      const ownerStatus: SalonFloorChair["status"] = isLeadSuspended
        ? "Suspended"
        : ((user as any)?.staff_status as SalonFloorChair["status"]) || "Active";

      list.push({
        chairNumber: 1,
        barberId: salonId,
        barberName: user?.name ? user.name.split("(")[0].trim() : "Lead Stylist",
        email: user?.email,
        phone: user?.phone,
        role: (user as any)?.staff_title || "Lead Specialist",
        status: ownerStatus,
        avatar_url: user?.avatar_url || user?.logo_url || null,
        isLead: true,
        services: [],
      });
    }

    staffList.forEach((member: any) => {
      const chairNum = member.chair_number || list.length + 1;
      const isOwner = String(member.id) === String(salonId);
      const effectiveStatus: SalonFloorChair["status"] =
        member.status === "Suspended"
          ? "Suspended"
          : (member.status as SalonFloorChair["status"]) || "Active";

      list.push({
        chairNumber: chairNum,
        barberId: member.id,
        barberName: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role || (isOwner ? "Lead Specialist" : "Salon Barber"),
        status: effectiveStatus,
        avatar_url: member.avatar_url || member.logo_url || (isOwner ? user?.avatar_url || user?.logo_url : null),
        isLead: isOwner || Boolean(member.is_lead),
        services: member.services || [],
      });
    });

    return list;
  }, [
    salonId,
    staffList,
    user?.name,
    user?.email,
    user?.phone,
    user?.avatar_url,
    user?.logo_url,
    (user as any)?.is_lead,
    (user as any)?.staff_status,
    (user as any)?.account_status,
    (user as any)?.staff_title,
  ]);

  const activeCount = useMemo(
    () => chairs.filter((c) => c.status === "Active").length,
    [chairs]
  );

  const suspendedCount = useMemo(
    () => chairs.filter((c) => c.status === "Suspended").length,
    [chairs]
  );

  const chairsCount = useMemo(
    () => (chairs.length > 0 ? chairs.length : Math.max(1, capacity)),
    [chairs.length, capacity]
  );

  return {
    chairs,
    staffList,
    activeCount,
    suspendedCount,
    chairsCount,
    isLoading,
    refresh,
  };
}
