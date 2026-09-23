import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeImages } from "@/hooks/useThemeImages";

interface BarberOption {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  image: ImageSourcePropType;
  avatar: ImageSourcePropType;
}

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
}

const AVAILABLE_SERVICES: ServiceItem[] = [
  {
    id: "sc1",
    name: "Skin Fade & Edge Up",
    description: "Precision clipper cut with razor finish",
    price: 15000,
    duration: 45,
  },
  {
    id: "sc2",
    name: "Beard Sculpt & Oil Treatment",
    description: "Beard shaping, hot towel & nourishing oil",
    price: 10000,
    duration: 30,
  },
  {
    id: "sc3",
    name: "Deluxe Hair Wash & Style",
    description: "Deep cleansing scalp wash with pomade styling",
    price: 8000,
    duration: 20,
  },
  {
    id: "sc4",
    name: "Full Royal Grooming Package",
    description: "Haircut, beard, facial steam & hot towel",
    price: 30000,
    duration: 75,
  },
];

const DAYS = [
  { name: "Mon", number: 14 },
  { name: "Tue", number: 15 },
  { name: "Wed", number: 16 },
  { name: "Thu", number: 17 },
  { name: "Fri", number: 18 },
];

const TIMES = [
  "09:00 AM",
  "10:30 AM",
  "11:15 AM",
  "01:00 PM",
  "02:30 PM",
  "04:00 PM",
];

import { barberService } from "@/services/barberService";

export default function BookingDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;
  const params = useLocalSearchParams<{ barberId?: string; barberName?: string }>();

  const initialBarber: BarberOption = {
    id: params.barberId || "4",
    name: params.barberName || "Master Barber",
    specialty: "Professional Grooming",
    rating: 5.0,
    image: profilePic,
    avatar: profilePic,
  };

  const [barbersList, setBarbersList] = useState<BarberOption[]>([initialBarber]);
  const [selectedBarber, setSelectedBarber] = useState<BarberOption>(initialBarber);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>(AVAILABLE_SERVICES);
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "sc1",
    "sc2",
  ]);
  const [selectedDay, setSelectedDay] = useState(15);
  const [selectedTime, setSelectedTime] = useState("10:30 AM");

  useEffect(() => {
    async function loadData() {
      try {
        const [apiBarbers, apiServices] = await Promise.all([
          barberService.getNearbyBarbers(),
          barberService.getBarberServices(Number(selectedBarber.id) || 4),
        ]);
        if (Array.isArray(apiBarbers) && apiBarbers.length > 0) {
          const mapped: BarberOption[] = apiBarbers.map((b, idx) => ({
            id: (b.id || idx + 1).toString(),
            name: b.name || "Master Barber",
            specialty: b.bio || "Fade Specialist",
            rating: typeof b.rating === "number" ? b.rating : 4.9,
            image: profilePic,
            avatar: profilePic,
          }));
          setBarbersList(mapped);
          if (mapped[0]) setSelectedBarber(mapped[0]);
        }
        if (Array.isArray(apiServices) && apiServices.length > 0) {
          const mappedSv: ServiceItem[] = apiServices.map((s, idx) => ({
            id: (s.id || idx + 1).toString(),
            name: s.name,
            description: `${s.category || "Haircut & Grooming"} • ${s.duration_minutes || 30} mins`,
            price: s.price,
            duration: s.duration_minutes || 30,
          }));
          setAvailableServices(mappedSv);
          if (mappedSv[0]?.id) setSelectedServices([mappedSv[0].id]);
        }
      } catch {
        // Fallback
      }
    }
    loadData();
  }, []);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length === 1) {
        showToast("Please keep at least one service selected.", "info");
        return;
      }
      setSelectedServices(selectedServices.filter((s) => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const activeServiceObjects = AVAILABLE_SERVICES.filter((s) =>
    selectedServices.includes(s.id)
  );

  const totalAmount = activeServiceObjects.reduce(
    (sum, item) => sum + item.price,
    0
  );

  const totalDuration = activeServiceObjects.reduce(
    (sum, item) => sum + item.duration,
    0
  );

  const handleConfirmBooking = () => {
    const serviceTitles = activeServiceObjects.map((s) => s.name).join(" + ");
    router.push({
      pathname: "/Pages/checkout" as any,
      params: {
        barberName: selectedBarber.name,
        serviceName: serviceTitles,
        price: totalAmount.toFixed(2),
        duration: `${totalDuration} mins`,
        date: `Tuesday, Oct ${selectedDay}, 2023`,
        time: selectedTime,
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("booking.bookAppointment")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => showToast("Custom service preferences are saved.", "info")}
          style={styles.headerBtn}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Section: Select Barber */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
            {t("booking.selectStylist")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barbersList}
          >
            {barbersList.map((barber) => {
              const isSelected = selectedBarber.id === barber.id;
              return (
                <TouchableOpacity
                  key={barber.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedBarber(barber)}
                  style={styles.barberAvatarItem}
                >
                  <View
                    style={[
                      styles.avatarBorder,
                      isSelected && {
                        borderColor: "#A3B39C",
                        borderWidth: 2.5,
                      },
                    ]}
                  >
                    <Image source={barber.avatar} style={styles.barberImg} />
                  </View>
                  <Text
                    style={[
                      styles.barberNameText,
                      {
                        color: isSelected ? "#FFFFFF" : colors.secondarytext,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {barber.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Section: Select Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              {t("booking.serviceDetails")}
            </Text>
            <Text style={[styles.selectedCountText, { color: colors.secondarytext }]}>
              {t("booking.selectedCount", { count: selectedServices.length })}
            </Text>
          </View>

          <View style={styles.servicesList}>
            {availableServices.map((service) => {
              const isChecked = selectedServices.includes(service.id);
              return (
                <TouchableOpacity
                  key={service.id}
                  activeOpacity={0.8}
                  onPress={() => toggleService(service.id)}
                  style={styles.serviceRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isChecked
                        ? [styles.checkboxChecked, { backgroundColor: "#A3B39C" }]
                        : { borderColor: colors.surfacevariant },
                    ]}
                  >
                    {isChecked && (
                      <Ionicons name="checkmark" size={14} color="#1C1E1B" />
                    )}
                  </View>

                  <View style={styles.serviceDetails}>
                    <Text
                      style={[
                        styles.serviceTitle,
                        { color: colors.primarytext },
                      ]}
                    >
                      {service.name}
                    </Text>
                    <Text
                      style={[
                        styles.serviceSubtext,
                        { color: colors.secondarytext },
                      ]}
                    >
                      {service.description}
                    </Text>
                  </View>

                  <Text
                    style={[styles.servicePrice, { color: colors.primarytext }]}
                  >
                    {service.price.toFixed(0)} CFA
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section: Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
            {t("booking.dateTimeLabel")}
          </Text>

          {/* Day Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
          >
            {DAYS.map((day) => {
              const isSelected = selectedDay === day.number;
              return (
                <TouchableOpacity
                  key={day.number}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDay(day.number)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                      borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayName,
                      { color: isSelected ? "#1C1E1B" : colors.secondarytext },
                    ]}
                  >
                    {day.name}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: isSelected ? "#1C1E1B" : colors.primarytext,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {day.number}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Time Slots Vertical / Grid */}
          <View style={styles.timeSlotsColumn}>
            {TIMES.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <TouchableOpacity
                  key={time}
                  activeOpacity={0.8}
                  onPress={() => setSelectedTime(time)}
                  style={[
                    styles.timeSlotRow,
                    {
                      backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                      borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      {
                        color: isSelected ? "#1C1E1B" : colors.secondarytext,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Booking Summary Box */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.primarytext }]}>
            {t("booking.checkoutTitle")}
          </Text>

          {activeServiceObjects.map((service) => (
            <View key={service.id} style={styles.summaryItemRow}>
              <Text
                style={[styles.summaryItemName, { color: colors.secondarytext }]}
              >
                {service.name}
              </Text>
              <Text
                style={[styles.summaryItemPrice, { color: colors.primarytext }]}
              >
                {service.price.toFixed(0)} CFA
              </Text>
            </View>
          ))}

          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <View style={styles.summaryTotalRow}>
            <Text style={[styles.totalLabel, { color: colors.primarytext }]}>
              {t("booking.totalAmount")}
            </Text>
            <Text style={[styles.totalPrice, { color: colors.primarytext }]}>
              {totalAmount.toFixed(0)} CFA
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Confirm Booking Button */}
      <View
        style={[
          styles.bottomActionBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: colors.background,
            borderTopColor: colors.surfacevariant,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleConfirmBooking}
          style={[styles.confirmBtn, { backgroundColor: "#A3B39C" }]}
        >
          <Ionicons name="calendar-outline" size={18} color="#1C1E1B" />
          <Text style={styles.confirmBtnText}>{t("booking.confirmAndBook")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  selectedCountText: {
    fontSize: 12.5,
  },
  barbersList: {
    gap: 16,
    paddingRight: 10,
  },
  barberAvatarItem: {
    alignItems: "center",
    gap: 6,
  },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#3D4439",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  barberImg: {
    width: "100%",
    height: "100%",
  },
  barberNameText: {
    fontSize: 12.5,
  },
  servicesList: {
    gap: 16,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  serviceDetails: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    marginBottom: 2,
  },
  serviceSubtext: {
    fontSize: 12,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  daysRow: {
    gap: 10,
    marginBottom: 16,
  },
  dayPill: {
    width: 58,
    height: 68,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  dayName: {
    fontSize: 11.5,
  },
  dayNumber: {
    fontSize: 16,
  },
  timeSlotsColumn: {
    gap: 10,
  },
  timeSlotRow: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timeSlotText: {
    fontSize: 13.5,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  summaryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryItemName: {
    fontSize: 13.5,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 10,
  },
  summaryTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  bottomActionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 18,
    borderTopWidth: 1,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmBtnText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "700",
  },
});
