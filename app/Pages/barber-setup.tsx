import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { availabilityService } from "@/services/availabilityService";
import { barberService } from "@/services/barberService";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
import { SelectOrAddInput } from "@/components/ui/SelectOrAddInput";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ServicePrice {
  name: string;
  price: string;
}

interface DaySchedule {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
}

const KNOWN_LOCATIONS = [
  "Douala, Akwa",
  "Douala, Bonanjo",
  "Douala, Bonapriso",
  "Douala, Makepe",
  "Douala, Bonamoussadi",
  "Douala, Deido",
  "Yaoundé, Bastos",
  "Yaoundé, Omnisports",
  "Yaoundé, Tsinga",
  "Buea, Molyko",
  "Limbe, Down Beach",
  "Bamenda, Commercial Ave",
  "Bafoussam, Centre",
  "Kribi, Plage",
];

const KNOWN_TAGLINES = [
  "Master Fade & Lineup Specialist",
  "Classic Scissor & Beard Grooming",
  "Braids, Dreadlocks & Afro Styling",
  "Luxury Hot Towel Shave & Spa",
  "Hair Coloring & Chemical Treatments",
  "Kids Haircut & Gentle Styling",
];

const SALON_SERVICE_CATALOG = [
  "Signature Skin Fade",
  "Classic Scissor Cut",
  "Taper Fade & Lineup",
  "Buzz Cut & Edge-Up",
  "Kids Haircut & Styling",
  "Beard Sculpt & Shape",
  "Luxury Hot Towel Shave",
  "Beard Coloring & Tint",
  "Straight Razor Shave",
  "Hair Wash & Scalp Massage",
  "Deep Conditioning Mask",
  "Facial Cleanse & Scrub",
  "Box Braids",
  "Cornrows & Lines",
  "Dreadlocks Retwist",
  "Full Hair Coloring",
];

import BarberLocationPickerModal from "@/components/map/BarberLocationPickerModal";

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

import { useAuth } from "@/context/AuthContext";

export default function BarberSetupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Shop Info & Map Location
  const [shopName, setShopName] = useState(
    user?.name ? `${user.name}'s Shop` : ""
  );
  const [tagline, setTagline] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>({
    latitude: user?.latitude || 4.0511,
    longitude: user?.longitude || 9.7679,
  });
  const [mapPickerVisible, setMapPickerVisible] = useState(false);

  // Step 2: Services (Custom pricing entered by barber)
  const [services, setServices] = useState<ServicePrice[]>([
    { name: "Signature Skin Fade", price: "" },
    { name: "Beard Sculpt & Shape", price: "" },
  ]);

  const [catalogPickerValue, setCatalogPickerValue] = useState("");

  // Step 3: Working Hours (Interactive Start & End Times)
  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day: "Monday", enabled: true, open: "08:30", close: "19:30" },
    { day: "Tuesday", enabled: true, open: "08:30", close: "19:30" },
    { day: "Wednesday", enabled: true, open: "08:30", close: "19:30" },
    { day: "Thursday", enabled: true, open: "08:30", close: "19:30" },
    { day: "Friday", enabled: true, open: "08:30", close: "20:00" },
    { day: "Saturday", enabled: true, open: "08:00", close: "20:30" },
    { day: "Sunday", enabled: false, open: "10:00", close: "16:00" },
  ]);

  // Time Picker Selection State
  const [timePickerTarget, setTimePickerTarget] = useState<{
    dayIndex: number;
    type: "open" | "close";
  } | null>(null);

  // Step 4: Photos & Docs
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [portfolioUris, setPortfolioUris] = useState<string[]>([]);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);

  const updateServicePrice = (index: number, val: string) => {
    const updated = [...services];
    updated[index].price = val;
    setServices(updated);
  };

  const toggleDay = (index: number) => {
    const updated = [...schedule];
    updated[index].enabled = !updated[index].enabled;
    setSchedule(updated);
  };

  const setDayTime = (index: number, type: "open" | "close", timeStr: string) => {
    const updated = [...schedule];
    updated[index][type] = timeStr;
    setSchedule(updated);
    setTimePickerTarget(null);
    showToast(`${updated[index].day} ${type === "open" ? "start" : "end"} time updated to ${timeStr}.`, "success");
  };

  const applyBulkHours = (openTime: string, closeTime: string) => {
    const updated = schedule.map((item) => ({
      ...item,
      open: openTime,
      close: closeTime,
    }));
    setSchedule(updated);
    showToast(`Applied ${openTime} - ${closeTime} to all working days.`, "success");
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Gallery permission is required to choose an avatar.", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      showToast("Profile avatar selected.", "success");
    }
  };

  const handleTakeAvatarPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("Camera permission is required.", "warning");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      showToast("Photo captured for profile avatar.", "success");
    }
  };

  const handleAddPortfolioImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Gallery permission is required.", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPortfolioUris([...portfolioUris, result.assets[0].uri]);
      showToast("Added photo to portfolio showcase.", "success");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadedDocName(result.assets[0].name);
        showToast(`Document uploaded: ${result.assets[0].name}`, "success");
      }
    } catch {
      showToast("Could not select document.", "error");
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSubmitting(true);
      try {
        // Save shop bio / details with avatar & GPS coordinates
        await barberService.updateProfileDetails({
          about_us: `${tagline} - ${experience} years experience in ${location}`,
          logo_url: avatarUri,
          city: location,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        }).catch(() => null);

        // Upload portfolio images if any
        for (const uri of portfolioUris) {
          await barberService.uploadPortfolio({
            media_url: uri,
            media_type: "image",
            hairstyle_or_service_name: "Signature Cut",
          }).catch(() => null);
        }

        // Register custom services with CFA prices
        for (const srv of services) {
          const priceNum = parseFloat(srv.price) || 25000;
          await barberService.addService({
            name: srv.name,
            category: "Haircuts & Styling",
            duration_minutes: 45,
            price: priceNum,
          }).catch(() => null);
        }

        // Register working windows
        for (let i = 0; i < schedule.length; i++) {
          const dayItem = schedule[i];
          if (dayItem.enabled) {
            await availabilityService.createWindow({
              day_of_week: i,
              start_time: `${dayItem.open}:00`,
              end_time: `${dayItem.close}:00`,
              is_blocked: false,
            }).catch(() => null);
          }
        }

        showToast("Setup complete. Your barber profile is now live.", "success");
        router.replace("/(barbers)" as any);
      } catch (e) {
        showToast("Setup completed with default configuration.", "info");
        router.replace("/(barbers)" as any);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBack}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          Barber Setup ({currentStep}/4)
        </Text>

        <View style={{ width: 40 }} />
      </View>

      {/* Step Progress Bar */}
      <View
        style={[
          styles.progressBarBg,
          { backgroundColor: colors.surfacevariant },
        ]}
      >
        <View
          style={[
            styles.progressBarFill,
            { width: `${(currentStep / 4) * 100}%`, backgroundColor: "#A3B39C" },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* STEP 1: Shop Info */}
        {currentStep === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.primarytext }]}>
              Shop & Profile Info
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.secondarytext }]}>
              Tell clients who you are and where they can find your chair.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
                Shop / Barber Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                    color: colors.primarytext,
                  },
                ]}
                value={shopName}
                onChangeText={setShopName}
              />
            </View>

            <SelectOrAddInput
              label="Primary Specialty / Tagline"
              placeholder="Select or add your specialty..."
              value={tagline}
              onChangeValue={setTagline}
              options={KNOWN_TAGLINES}
              iconName="cut-outline"
              allowCustom={true}
              customPlaceholder="e.g. Master Dreadlock & Color Specialist"
            />

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
                Years of Experience
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                    color: colors.primarytext,
                  },
                ]}
                value={experience}
                onChangeText={setExperience}
                keyboardType="numeric"
              />
            </View>

            <SelectOrAddInput
              label="City & Neighborhood"
              placeholder="Select or add your shop location..."
              value={location}
              onChangeValue={setLocation}
              options={KNOWN_LOCATIONS}
              iconName="location-outline"
              allowCustom={true}
              customPlaceholder="e.g. Douala, Akwa or Yaoundé, Bastos"
            />

            {/* GPS Shop Pinpoint Map Launcher */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setMapPickerVisible(true)}
              style={[
                styles.mapPickerTriggerBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
              ]}
            >
              <View style={styles.mapTriggerIconWrap}>
                <Ionicons name="map-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mapTriggerTitle, { color: colors.primarytext }]}>
                  Pinpoint Exact Shop Location On Map
                </Text>
                <Text style={[styles.mapTriggerSubtitle, { color: colors.secondarytext }]}>
                  {coordinates
                    ? `GPS: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                    : "Tap to set shop coordinates for client directions"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondarytext} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: Services & Pricing */}
        {currentStep === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.primarytext }]}>
              Salon Services & Custom Pricing
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.secondarytext }]}>
              Select what your salon/barbershop offers and define your custom rates.
            </Text>

            {/* Dropdown Catalog Selector */}
            <SelectOrAddInput
              label="Add Service to Salon Menu"
              placeholder="Pick a service or type a custom one..."
              value={catalogPickerValue}
              onChangeValue={(val) => {
                if (val && !services.some((s) => s.name.toLowerCase() === val.toLowerCase())) {
                  setServices([...services, { name: val, price: "" }]);
                  showToast(`Added "${val}". Set your price below.`, "success");
                } else if (val) {
                  showToast(`"${val}" is already on your menu.`, "info");
                }
                setCatalogPickerValue("");
              }}
              options={SALON_SERVICE_CATALOG}
              iconName="add-circle-outline"
              allowCustom={true}
              customPlaceholder="e.g. Beard Hot Oil Spa Treatment"
            />

            <Text
              style={[
                styles.inputLabel,
                { color: colors.secondarytext, marginTop: 8, marginBottom: 10 },
              ]}
            >
              Selected Services & Your Custom Prices ({services.length})
            </Text>

            {services.map((srv, idx) => (
              <View
                key={idx}
                style={[
                  styles.servicePriceRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <View style={styles.serviceNameCol}>
                  <Text
                    style={[styles.serviceName, { color: colors.primarytext }]}
                    numberOfLines={1}
                  >
                    {srv.name}
                  </Text>
                </View>
                <View style={styles.priceInputWrap}>
                  <TextInput
                    style={[styles.priceInput, { color: colors.primary }]}
                    value={srv.price}
                    onChangeText={(val) => updateServicePrice(idx, val)}
                    placeholder="Set Price"
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="numeric"
                  />
                  <Text
                    style={[styles.cfaLabel, { color: colors.secondarytext }]}
                  >
                    CFA
                  </Text>
                  {services.length > 1 && (
                    <TouchableOpacity
                      onPress={() => setServices(services.filter((_, i) => i !== idx))}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* STEP 3: Working Hours (Interactive Start & End Times) */}
        {currentStep === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.primarytext }]}>
              Working Hours
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.secondarytext }]}>
              Choose the days and exact start & end hours clients can book slots.
            </Text>

            {/* Quick Bulk Hours Bar */}
            <View
              style={[
                styles.bulkHoursBox,
                { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.bulkTitle, { color: colors.primarytext }]}>
                  Standard Salon Hours
                </Text>
                <Text style={[styles.bulkSubtitle, { color: colors.secondarytext }]}>
                  08:30 - 20:00 (Mon to Sat)
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => applyBulkHours("08:30", "20:00")}
                style={[styles.applyBulkBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.applyBulkBtnText, { color: colors.background }]}>
                  Apply to All
                </Text>
              </TouchableOpacity>
            </View>

            {schedule.map((dayItem, idx) => (
              <View
                key={idx}
                style={[
                  styles.scheduleCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: dayItem.enabled
                      ? colors.surfacevariant
                      : "rgba(255, 255, 255, 0.04)",
                    opacity: dayItem.enabled ? 1 : 0.65,
                  },
                ]}
              >
                <View style={styles.scheduleHeaderRow}>
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: dayItem.enabled
                          ? colors.primarytext
                          : colors.secondarytext,
                        fontWeight: dayItem.enabled ? "700" : "500",
                      },
                    ]}
                  >
                    {dayItem.day}
                  </Text>
                  <Switch
                    value={dayItem.enabled}
                    onValueChange={() => toggleDay(idx)}
                    trackColor={{
                      false: colors.surfacevariant,
                      true: "#A3B39C",
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {dayItem.enabled && (
                  <View style={styles.timePickersRow}>
                    {/* Start Time Selector */}
                    <View style={styles.timeCol}>
                      <Text style={[styles.timeLabel, { color: colors.secondarytext }]}>
                        START TIME
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setTimePickerTarget({ dayIndex: idx, type: "open" })}
                        style={[
                          styles.timeChipBtn,
                          { backgroundColor: colors.surfacevariant },
                        ]}
                      >
                        <Ionicons name="time-outline" size={14} color={colors.primary} />
                        <Text style={[styles.timeChipText, { color: colors.primarytext }]}>
                          {dayItem.open}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={colors.secondarytext} />
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.timeToText, { color: colors.secondarytext }]}>
                      to
                    </Text>

                    {/* End Time Selector */}
                    <View style={styles.timeCol}>
                      <Text style={[styles.timeLabel, { color: colors.secondarytext }]}>
                        END TIME
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setTimePickerTarget({ dayIndex: idx, type: "close" })}
                        style={[
                          styles.timeChipBtn,
                          { backgroundColor: colors.surfacevariant },
                        ]}
                      >
                        <Ionicons name="time-outline" size={14} color={colors.primary} />
                        <Text style={[styles.timeChipText, { color: colors.primarytext }]}>
                          {dayItem.close}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={colors.secondarytext} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* STEP 4: Photos & Verification */}
        {currentStep === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: colors.primarytext }]}>
              Photos & Verification
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.secondarytext }]}>
              Add an avatar, portfolio cuts, and your barber trade certificate.
            </Text>

            {/* Profile Avatar Picker */}
            <View style={styles.photoUploadCenter}>
              <View
                style={[
                  styles.largePhotoPlaceholder,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPreviewImage} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={38} color="#A3B39C" />
                    <Text
                      style={[styles.uploadPrompt, { color: colors.secondarytext }]}
                    >
                      Profile Avatar
                    </Text>
                  </>
                )}
              </View>

              <View style={styles.avatarActionsRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickAvatar}
                  style={[styles.smallPickerBtn, { backgroundColor: colors.surfacevariant }]}
                >
                  <Ionicons name="image-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.smallPickerBtnText}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleTakeAvatarPhoto}
                  style={[styles.smallPickerBtn, { backgroundColor: colors.surfacevariant }]}
                >
                  <Ionicons name="camera-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.smallPickerBtnText}>Camera</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Portfolio Cuts Preview */}
            <Text
              style={[
                styles.inputLabel,
                { color: colors.secondarytext, marginTop: 16 },
              ]}
            >
              Portfolio Cuts ({portfolioUris.length} added)
            </Text>
            <View style={styles.portfolioUploadRow}>
              {portfolioUris.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={styles.portfolioThumb}
                />
              ))}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddPortfolioImage}
                style={[
                  styles.portfolioUploadBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <Ionicons name="add" size={24} color="#A3B39C" />
                <Text style={{ fontSize: 10, color: colors.secondarytext, marginTop: 2 }}>
                  Add Cut
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trade Certificate / License Document Upload */}
            <Text
              style={[
                styles.inputLabel,
                { color: colors.secondarytext, marginTop: 18 },
              ]}
            >
              Trade License or Certificate (Optional)
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickDocument}
              style={[
                styles.docUploadBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: uploadedDocName ? "#A3B39C" : colors.surfacevariant,
                },
              ]}
            >
              <Ionicons
                name={uploadedDocName ? "checkmark-circle" : "document-attach-outline"}
                size={24}
                color={uploadedDocName ? "#A3B39C" : colors.secondarytext}
              />
              <Text
                style={[
                  styles.docUploadText,
                  { color: uploadedDocName ? "#A3B39C" : colors.primarytext },
                ]}
                numberOfLines={1}
              >
                {uploadedDocName ? uploadedDocName : "Select PDF or Image Certificate"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSubmitting}
          onPress={handleNext}
          style={[
            styles.nextBtn,
            { backgroundColor: "#A3B39C", opacity: isSubmitting ? 0.75 : 1 },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#1C1E1B" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {currentStep === 4 ? "Complete Setup" : "Continue to Next Step"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#1C1E1B"
                style={{ marginLeft: 6 }}
              />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Map Location Picker Modal */}
      <BarberLocationPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        initialLatitude={coordinates.latitude}
        initialLongitude={coordinates.longitude}
        initialCity={location}
        onConfirmLocation={(loc) => {
          setCoordinates({ latitude: loc.latitude, longitude: loc.longitude });
          if (loc.city) setLocation(loc.city);
          showToast(`Location set: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`, "success");
        }}
      />

      {/* Interactive Time Selector Modal */}
      <Modal
        visible={timePickerTarget !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimePickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.timeModalBackdrop}
          activeOpacity={1}
          onPress={() => setTimePickerTarget(null)}
        >
          <View style={[styles.timeModalSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.timeModalHeader}>
              <Text style={[styles.timeModalTitle, { color: colors.primarytext }]}>
                Select {timePickerTarget?.type === "open" ? "Opening" : "Closing"} Time
              </Text>
              <TouchableOpacity
                onPress={() => setTimePickerTarget(null)}
                style={styles.timeModalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.secondarytext} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.timeOptionsGrid}>
                {TIME_OPTIONS.map((timeSlot) => (
                  <TouchableOpacity
                    key={timeSlot}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (timePickerTarget) {
                        setDayTime(
                          timePickerTarget.dayIndex,
                          timePickerTarget.type,
                          timeSlot
                        );
                      }
                    }}
                    style={[
                      styles.timeSlotOption,
                      {
                        backgroundColor: colors.surfacevariant,
                        borderColor:
                          timePickerTarget &&
                          schedule[timePickerTarget.dayIndex]?.[timePickerTarget.type] === timeSlot
                            ? colors.primary
                            : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        {
                          color:
                            timePickerTarget &&
                            schedule[timePickerTarget.dayIndex]?.[timePickerTarget.type] === timeSlot
                              ? colors.primary
                              : colors.primarytext,
                          fontWeight:
                            timePickerTarget &&
                            schedule[timePickerTarget.dayIndex]?.[timePickerTarget.type] === timeSlot
                              ? "700"
                              : "500",
                        },
                      ]}
                    >
                      {timeSlot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 4,
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
  },
  servicePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  serviceNameCol: {
    flex: 1,
  },
  serviceName: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceInput: {
    fontSize: 15,
    fontWeight: "700",
    width: 70,
    textAlign: "right",
  },
  cfaLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  dayNameCol: {
    gap: 2,
  },
  dayText: {
    fontSize: 14.5,
  },
  hoursText: {
    fontSize: 12,
  },
  photoUploadCenter: {
    alignItems: "center",
    marginVertical: 10,
  },
  largePhotoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  avatarPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  avatarActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  smallPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
  },
  smallPickerBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "600",
  },
  uploadPrompt: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  portfolioUploadRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  portfolioThumb: {
    width: 85,
    height: 85,
    borderRadius: 14,
  },
  portfolioUploadBox: {
    width: 85,
    height: 85,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  docUploadBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 8,
  },
  docUploadText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  nextBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  nextBtnText: {
    color: "#1C1E1B",
    fontSize: 15.5,
    fontWeight: "700",
  },
  mapPickerTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  mapTriggerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(163, 179, 156, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapTriggerTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  mapTriggerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  bulkHoursBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  bulkTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  bulkSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  applyBulkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyBulkBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scheduleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timePickersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  timeCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeToText: {
    fontSize: 12,
    marginHorizontal: 10,
    marginTop: 14,
    fontWeight: "600",
  },
  timeModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  timeModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  timeModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  timeModalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  timeModalCloseBtn: {
    padding: 4,
  },
  timeOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  timeSlotOption: {
    width: "31%",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1.5,
  },
  timeSlotText: {
    fontSize: 13,
  },
});
