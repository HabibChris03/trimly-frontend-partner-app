import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { BARBER_EARNINGS_TUTORIAL } from "@/constants/barberTutorials";
import { barberService } from "@/services/barberService";

const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;

interface DayRevenue {
  day: string;
  amount: number;
  heightPct: number;
}

const DEFAULT_WEEKLY_BARS: DayRevenue[] = [
  { day: "Mon", amount: 0, heightPct: 8 },
  { day: "Tue", amount: 0, heightPct: 8 },
  { day: "Wed", amount: 0, heightPct: 8 },
  { day: "Thu", amount: 0, heightPct: 8 },
  { day: "Fri", amount: 0, heightPct: 8 },
  { day: "Sat", amount: 0, heightPct: 8 },
  { day: "Sun", amount: 0, heightPct: 8 },
];

interface ServiceRevenue {
  name: string;
  count: number;
  revenue: string;
  barPct: number;
}

interface PayoutRecord {
  id: string;
  date: string;
  amount: string;
  raw_amount?: number;
  status: "Completed" | "Processing" | "Pending";
  payment_method?: string;
  account_details?: string;
  reference_number?: string;
}

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000];

export default function BarberEarningsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { handleScroll, showTabBar } = useTabBarVisibility();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );

  const isSalon = Boolean(user?.role === "salon" || user?.is_manager || user?.is_lead);
  const isStaff = Boolean(user?.parent_salon_id && !isSalon);

  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<any[]>([]);

  const [selectedPeriod, setSelectedPeriod] =
    useState<(typeof PERIODS)[number]>("This Week");
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [completedEarnings, setCompletedEarnings] = useState(0);
  const [pendingEarnings, setPendingEarnings] = useState(0);
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [avgTicket, setAvgTicket] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [weeklyBars, setWeeklyBars] = useState<DayRevenue[]>(DEFAULT_WEEKLY_BARS);
  const [topServices, setTopServices] = useState<ServiceRevenue[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<PayoutRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Payout Modal States
  const [payoutModalVisible, setPayoutModalVisible] = useState(false);
  const [statementModalVisible, setStatementModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "MTN Mobile Money" | "Orange Money" | "Direct Bank Transfer"
  >("MTN Mobile Money");
  const [accountDetails, setAccountDetails] = useState(user?.phone || "");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);

  const fetchEarningsData = useCallback(async () => {
    try {
      const periodMap: Record<string, "today" | "week" | "month" | "all_time"> = {
        "Today": "today",
        "This Week": "week",
        "This Month": "month",
        "All Time": "all_time",
      };

      const apiSummary = await barberService.getEarningsSummary(
        periodMap[selectedPeriod] || "week",
        selectedStaffId || undefined
      );
      if (apiSummary) {
        setTotalRevenue(apiSummary.total_earnings ?? 0);
        setCompletedEarnings(apiSummary.completed_earnings ?? apiSummary.total_earnings ?? 0);
        setPendingEarnings(apiSummary.pending_earnings ?? 0);
        setAppointmentCount(
          apiSummary.total_appointments ?? apiSummary.completed_appointments ?? 0
        );
        setAvgTicket(Math.round(apiSummary.average_ticket ?? 0));
        setAvailableBalance(apiSummary.available_payout_balance ?? apiSummary.total_earnings ?? 0);

        if (Array.isArray(apiSummary.weekly_bars) && apiSummary.weekly_bars.length > 0) {
          setWeeklyBars(apiSummary.weekly_bars);
        }

        if (Array.isArray(apiSummary.top_services) && apiSummary.top_services.length > 0) {
          setTopServices(apiSummary.top_services);
        } else {
          setTopServices([]);
        }

        if (Array.isArray(apiSummary.recent_payouts)) {
          setRecentPayouts(apiSummary.recent_payouts);
        }
      }
    } catch {
      // Keep existing state gracefully
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, selectedStaffId]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  useEffect(() => {
    if (isSalon) {
      const salonId = user?.id || 4;
      barberService.listSalonStaff(salonId).then((res) => {
        const list = Array.isArray(res) ? res : (res as any)?.staff || [];
        setStaffList(list);
      }).catch(() => setStaffList([]));
    }
  }, [isSalon, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
    showToast("Financial data synced.", "info");
  }, [fetchEarningsData, showToast]);

  const handleRequestPayout = async () => {
    const num = parseFloat(withdrawAmount.replace(/[^0-9.]/g, ""));
    if (isNaN(num) || num <= 0) {
      showToast("Please enter a valid withdrawal amount.", "error");
      return;
    }
    if (num > availableBalance) {
      showToast(
        `Amount exceeds available balance (${availableBalance.toLocaleString()} CFA).`,
        "error"
      );
      return;
    }
    if (!accountDetails.trim()) {
      showToast("Please provide your mobile money phone number or account details.", "error");
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await barberService.requestPayout({
        amount: num,
        payment_method: paymentMethod,
        account_details: accountDetails.trim(),
      });
      showToast(
        res?.message || `Payout of ${num.toLocaleString()} CFA requested successfully!`,
        "success"
      );
      setPayoutModalVisible(false);
      setWithdrawAmount("");
      await fetchEarningsData();
    } catch (err: any) {
      showToast(err.message || "Failed to process payout request. Please try again.", "error");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Executive Clean Header (No back button since Earnings is a primary tab) */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>{t("earnings.revenueAndPayouts")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            {selectedStaffId
              ? `${staffList.find((s) => s.id === selectedStaffId)?.name || "Staff"}'s Performance`
              : (isStaff ? "Your Personal Earnings" : t("earnings.financialAnalytics"))}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="help-circle-outline" size={19} color={colors.brand} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setStatementModalVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="document-text-outline" size={19} color={colors.primaryText} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* Salon Manager Staff Filter Strip */}
        {isSalon && staffList.length > 0 && (
          <View style={styles.staffFilterContainer}>
            <Text style={[styles.staffFilterLabel, { color: colors.secondaryText }]}>
              {user?.role === "salon" ? "Filter Revenue by Staff:" : "View Performance:"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.staffFilterScroll}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSelectedStaffId(null)}
                style={[
                  styles.staffFilterChip,
                  selectedStaffId === null
                    ? { backgroundColor: colors.brand, borderColor: colors.brand }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="business"
                  size={13}
                  color={selectedStaffId === null ? colors.onBrand : colors.brand}
                />
                <Text
                  style={[
                    styles.staffFilterChipText,
                    {
                      color: selectedStaffId === null ? colors.onBrand : colors.primaryText,
                      fontWeight: selectedStaffId === null ? "700" : "500",
                    },
                  ]}
                >
                  All Salon Revenue
                </Text>
              </TouchableOpacity>

              {staffList.map((member) => {
                const isSelected = selectedStaffId === member.id;
                return (
                  <TouchableOpacity
                    key={member.id}
                    activeOpacity={0.85}
                    onPress={() => setSelectedStaffId(member.id)}
                    style={[
                      styles.staffFilterChip,
                      isSelected
                        ? { backgroundColor: colors.brand, borderColor: colors.brand }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name="person"
                      size={12}
                      color={isSelected ? colors.onBrand : colors.secondaryText}
                    />
                    <Text
                      style={[
                        styles.staffFilterChipText,
                        {
                          color: isSelected ? colors.onBrand : colors.primaryText,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Staff Privacy & Personal Earnings Banner */}
        {isStaff && (
          <View
            style={[
              styles.staffPrivacyBanner,
              { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: colors.brand },
            ]}
          >
            <Ionicons name="shield-checkmark" size={17} color={colors.brand} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.staffPrivacyTitle, { color: colors.primaryText }]}>
                Personal Booking Earnings
              </Text>
              <Text style={[styles.staffPrivacySub, { color: colors.secondaryText }]}>
                Showing only your personal earnings and statistics from your client appointments.
              </Text>
            </View>
          </View>
        )}

        {/* Available Balance Command Hero */}
        <View
          style={[
            styles.balanceHeroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.balanceHeroTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.balanceLabelRow}>
                <View style={[styles.pulseDot, { backgroundColor: colors.brand }]} />
                <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>{t("earnings.availableForPayout")}</Text>
              </View>
              <Text style={[styles.balanceAmount, { color: colors.primaryText }]}>
                {availableBalance.toLocaleString()}{" "}
                <Text style={{ fontSize: 20, color: colors.brand, fontWeight: "800" }}>CFA</Text>
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setWithdrawAmount(availableBalance > 0 ? availableBalance.toString() : "25000");
                setPayoutModalVisible(true);
              }}
              style={[
                styles.withdrawBtn,
                { backgroundColor: colors.brand },
              ]}
            >
              <Ionicons name="paper-plane" size={15} color={colors.onBrand} />
              <Text style={[styles.withdrawBtnText, { color: colors.onBrand }]}>{t("earnings.withdraw")}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />

          {/* Settled vs Pending Telemetry Strip */}
          <View style={styles.balanceMetaStrip}>
            <View style={styles.balanceMetaCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={[styles.microDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.balanceMetaTitle, { color: colors.secondaryText }]}>
                  Settled Revenue
                </Text>
              </View>
              <Text style={[styles.balanceMetaValue, { color: colors.primaryText }]}>
                {completedEarnings.toLocaleString()} CFA
              </Text>
            </View>

            <View style={[styles.verticalSeparator, { backgroundColor: colors.border }]} />

            <View style={styles.balanceMetaCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={[styles.microDot, { backgroundColor: pendingEarnings > 0 ? "#F59E0B" : colors.secondaryText }]} />
                <Text style={[styles.balanceMetaTitle, { color: colors.secondaryText }]}>
                  Pending Bookings
                </Text>
              </View>
              <Text style={[styles.balanceMetaValue, { color: pendingEarnings > 0 ? "#F59E0B" : colors.primaryText }]}>
                {pendingEarnings.toLocaleString()} CFA
              </Text>
            </View>
          </View>
        </View>

        {/* 4-Segmented Time Period Switcher */}
        <View style={[styles.periodsWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PERIODS.map((period) => {
            const isSelected = selectedPeriod === period;
            return (
              <TouchableOpacity
                key={period}
                activeOpacity={0.8}
                onPress={() => setSelectedPeriod(period)}
                style={[
                  styles.periodTab,
                  isSelected && {
                    backgroundColor: colors.brand,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    {
                      color: isSelected ? colors.onBrand : colors.secondaryText,
                      fontWeight: isSelected ? "900" : "600",
                    },
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Period Revenue & Operations Summary Card */}
        <View
          style={[
            styles.metricHeroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.metricHeaderRow}>
            <View>
              <Text style={[styles.metricPeriodSub, { color: colors.secondaryText }]}>
                Gross Generated ({selectedPeriod})
              </Text>
              <Text style={[styles.metricTotalNumber, { color: colors.primaryText }]}>
                {totalRevenue.toLocaleString()}{" "}
                <Text style={{ fontSize: 18, color: colors.brand }}>CFA</Text>
              </Text>
            </View>

            <View style={[styles.metricTrendPill, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
              <Ionicons name="trending-up" size={14} color={colors.brand} />
              <Text style={[styles.metricTrendText, { color: colors.brand }]}>
                Live
              </Text>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Sub-Metric Columns */}
          <View style={styles.metricTilesRow}>
            <View style={[styles.metricTile, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <View style={styles.metricTileIconRow}>
                <Ionicons name="calendar-outline" size={16} color={colors.brand} />
                <Text style={[styles.metricTileLabel, { color: colors.secondaryText }]}>
                  Appointments
                </Text>
              </View>
              <Text style={[styles.metricTileValue, { color: colors.primaryText }]}>
                {appointmentCount}{" "}
                <Text style={{ fontSize: 12, color: colors.secondaryText, fontWeight: "500" }}>
                  cuts
                </Text>
              </Text>
            </View>

            <View style={[styles.metricTile, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <View style={styles.metricTileIconRow}>
                <Ionicons name="receipt-outline" size={16} color={colors.brand} />
                <Text style={[styles.metricTileLabel, { color: colors.secondaryText }]}>
                  Average Ticket
                </Text>
              </View>
              <Text style={[styles.metricTileValue, { color: colors.brand }]}>
                {avgTicket.toLocaleString()}{" "}
                <Text style={{ fontSize: 12, color: colors.secondaryText, fontWeight: "500" }}>
                  CFA
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Revenue Trends Bar Chart */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Weekly Revenue Cadence
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
                Daily revenue performance (Mon — Sun)
              </Text>
            </View>
            <View style={[styles.chartLegend, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <View style={[styles.legendDot, { backgroundColor: colors.brand }]} />
              <Text style={[styles.legendText, { color: colors.secondaryText }]}>
                Volume
              </Text>
            </View>
          </View>

          <View style={styles.barsContainer}>
            {weeklyBars.map((bar, idx) => {
              const isPeak = bar.heightPct >= 60;
              return (
                <View key={bar.day} style={styles.barCol}>
                  <View style={[styles.barTrack, { backgroundColor: colors.elevated }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.max(bar.heightPct, 8)}%`,
                          backgroundColor: isPeak ? colors.brand : colors.brand,
                          opacity: isPeak ? 1 : 0.65,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barDayText,
                      {
                        color: isPeak ? colors.brand : colors.secondaryText,
                        fontWeight: isPeak ? "800" : "600",
                      },
                    ]}
                  >
                    {bar.day}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* {t("earnings.topServicesRevenue") || "Top Services by Revenue"} */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Top Services by Revenue
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
                {t("earnings.mostPopularCuts") || "Most popular cuts & styles ordered by clients"}
              </Text>
            </View>
          </View>

          {topServices.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="cut-outline" size={26} color={colors.secondaryText} />
              <Text style={[styles.emptyCardText, { color: colors.secondaryText }]}>
                {t("earnings.noServiceRevenueRecords") || "No service revenue records logged for this period yet."}
              </Text>
            </View>
          ) : (
            topServices.map((srv, idx) => (
              <View key={idx} style={styles.serviceRevRow}>
                <View style={styles.srvHeaderRow}>
                  <Text style={[styles.srvName, { color: colors.primaryText }]} numberOfLines={1}>
                    {srv.name}
                  </Text>
                  <Text style={[styles.srvRev, { color: colors.brand }]}>
                    {srv.revenue}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <Text style={[styles.srvCount, { color: colors.secondaryText }]}>
                    {srv.count} booked
                  </Text>
                  <Text style={[styles.srvPctText, { color: colors.secondaryText }]}>
                    {srv.barPct}% share
                  </Text>
                </View>

                <View style={[styles.srvProgressBarTrack, { backgroundColor: colors.elevated }]}>
                  <View
                    style={[
                      styles.srvProgressBarFill,
                      {
                        width: `${Math.min(Math.max(srv.barPct, 5), 100)}%`,
                        backgroundColor: colors.brand,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Payout Settlements */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Payout Settlements
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondaryText }]}>
                {t("earnings.withdrawalHistory") || "Withdrawal history to Mobile Money & Bank"}
              </Text>
            </View>
          </View>

          {recentPayouts.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="card-outline" size={26} color={colors.secondaryText} />
              <Text style={[styles.emptyCardText, { color: colors.secondaryText }]}>
                {t("earnings.noPayoutTransactions") || "No payout transactions yet. Tap Withdraw to cash out your balance."}
              </Text>
            </View>
          ) : (
            recentPayouts.map((payout) => {
              const isDone = payout.status === "Completed";
              const isProc = payout.status === "Processing";
              const statusColor = isDone ? "#22C55E" : isProc ? "#F59E0B" : "#3B82F6";

              return (
                <View
                  key={payout.id}
                  style={[styles.payoutRecordCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                >
                  <View style={styles.payoutRecordIconWrap}>
                    <Ionicons
                      name={
                        payout.payment_method?.includes("Orange")
                          ? "phone-portrait-outline"
                          : payout.payment_method?.includes("Bank")
                          ? "business-outline"
                          : "phone-portrait"
                      }
                      size={18}
                      color={colors.brand}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.payoutRecordMethod, { color: colors.primaryText }]}>
                      {payout.payment_method || "Mobile Money"}
                    </Text>
                    <Text style={[styles.payoutRecordDate, { color: colors.secondaryText }]}>
                      {payout.date} • {payout.account_details || user?.phone || "Saved line"}
                    </Text>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 3 }}>
                    <Text style={[styles.payoutRecordAmount, { color: colors.primaryText }]}>
                      {payout.amount}
                    </Text>
                    <View style={[styles.payoutStatusPill, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}35` }]}>
                      <Text style={[styles.payoutStatusText, { color: statusColor }]}>
                        {payout.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Withdrawal Modal */}
        <CustomModal
          visible={payoutModalVisible}
          title={t("earnings.withdrawAvailableFunds")}
          onClose={() => setPayoutModalVisible(false)}
        >
          <View style={styles.modalContentWrap}>
            <Text style={[styles.modalInputLabel, { color: colors.secondaryText }]}>
              Withdrawal Amount (CFA)
            </Text>

            {/* Amount Presets Strip */}
            <View style={styles.presetAmountsRow}>
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = withdrawAmount === amt.toString();
                return (
                  <TouchableOpacity
                    key={amt}
                    activeOpacity={0.8}
                    onPress={() => setWithdrawAmount(amt.toString())}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isSelected ? colors.brand : colors.elevated,
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: isSelected ? colors.onBrand : colors.primaryText,
                          fontWeight: isSelected ? "800" : "600",
                        },
                      ]}
                    >
                      {amt.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Amount Input */}
            <View
              style={[
                styles.modalInputWrap,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.currencyPrefix, { color: colors.brand }]}>CFA</Text>
              <TextInput
                style={[styles.modalTextInput, { color: colors.primaryText }]}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder={t("earnings.enterAmountPlaceholder") || "Enter amount..."}
                placeholderTextColor={colors.inputPlaceholder}
              />
              {withdrawAmount.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setWithdrawAmount("")}
                >
                  <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {/* Payment Method Selector */}
            <Text style={[styles.modalInputLabel, { color: colors.secondaryText, marginTop: 14 }]}>
              Destination Channel
            </Text>
            <View style={{ gap: 8 }}>
              {(["MTN Mobile Money", "Orange Money", "Direct Bank Transfer"] as const).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    activeOpacity={0.8}
                    onPress={() => setPaymentMethod(method)}
                    style={[
                      styles.methodOptionCard,
                      {
                        backgroundColor: isSelected ? "rgba(199, 243, 107, 0.1)" : colors.elevated,
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={isSelected ? colors.brand : colors.secondaryText}
                    />
                    <Text
                      style={[
                        styles.methodOptionText,
                        {
                          color: isSelected ? colors.brand : colors.primaryText,
                          fontWeight: isSelected ? "800" : "600",
                        },
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mobile Account Details */}
            <Text style={[styles.modalInputLabel, { color: colors.secondaryText, marginTop: 14 }]}>
              {paymentMethod.includes("Bank") ? "Bank Account / IBAN" : "Mobile Money Number"}
            </Text>
            <View
              style={[
                styles.modalInputWrap,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="call-outline" size={17} color={colors.secondaryText} />
              <TextInput
                style={[styles.modalTextInput, { color: colors.primaryText }]}
                keyboardType={paymentMethod.includes("Bank") ? "default" : "phone-pad"}
                value={accountDetails}
                onChangeText={setAccountDetails}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setPayoutModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.primaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isSubmittingPayout}
                onPress={handleRequestPayout}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.brand }]}
              >
                {isSubmittingPayout ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                    <Text style={[styles.modalConfirmBtnText, { color: colors.onBrand }]}>
                      {t("earnings.confirmWithdrawal") || "Confirm Withdrawal"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CustomModal>

        {/* Statement / Report Modal */}
        <CustomModal
          visible={statementModalVisible}
          title={t("earnings.financialStatement")}
          onClose={() => setStatementModalVisible(false)}
        >
          <View style={{ gap: 14, paddingTop: 6 }}>
            <View style={[styles.statementHeroBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Text style={[styles.statementHeroTitle, { color: colors.secondaryText }]}>
                {t("earnings.allTimeTotalSettled") || "All-Time Total Settled"}
              </Text>
              <Text style={[styles.statementHeroNumber, { color: colors.primaryText }]}>
                {completedEarnings.toLocaleString()} <Text style={{ color: colors.brand }}>CFA</Text>
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              <View style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: colors.secondaryText }]}>Registered Partner</Text>
                <Text style={[styles.statementVal, { color: colors.primaryText }]}>{user?.name || "Partner"}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: colors.secondaryText }]}>{t("earnings.payoutAccount") || "Payout Account"}</Text>
                <Text style={[styles.statementVal, { color: colors.primaryText }]}>{user?.phone || "+237 6XX XXX XXX"}</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: colors.secondaryText }]}>Total Cuts Delivered</Text>
                <Text style={[styles.statementVal, { color: colors.primaryText }]}>{appointmentCount} bookings</Text>
              </View>
              <View style={styles.statementRow}>
                <Text style={[styles.statementLabel, { color: colors.secondaryText }]}>Statement Currency</Text>
                <Text style={[styles.statementVal, { color: colors.brand, fontWeight: "800" }]}>Central African CFA (XAF)</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setStatementModalVisible(false);
                showToast("Statement exported & emailed to " + (user?.email || "account"), "success");
              }}
              style={[styles.exportBtn, { backgroundColor: colors.brand }]}
            >
              <Ionicons name="download-outline" size={18} color={colors.onBrand} />
              <Text style={[styles.exportBtnText, { color: colors.onBrand }]}>
                Export PDF Statement
              </Text>
            </TouchableOpacity>
          </View>
        </CustomModal>

        {/* Tutorial Tour Modal */}
        <PageTutorialModal
          screenKey="barber_earnings"
          title={BARBER_EARNINGS_TUTORIAL.title}
          subtitle={BARBER_EARNINGS_TUTORIAL.subtitle}
          steps={BARBER_EARNINGS_TUTORIAL.steps}
          visible={tutorialVisible}
          onClose={() => setTutorialVisible(false)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  staffFilterContainer: {
    gap: 6,
    marginBottom: 4,
  },
  staffFilterLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  staffFilterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  staffFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  staffFilterChipText: {
    fontSize: 12,
  },
  staffPrivacyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  staffPrivacyTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  staffPrivacySub: {
    fontSize: 11,
    lineHeight: 15,
  },

  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  balanceHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  balanceHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  balanceAmount: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  withdrawBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  balanceDivider: {
    height: 1,
    marginVertical: 14,
  },
  balanceMetaStrip: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceMetaCol: {
    flex: 1,
    gap: 3,
  },
  verticalSeparator: {
    width: 1,
    height: 32,
    marginHorizontal: 12,
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  balanceMetaTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  balanceMetaValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  periodsWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 15,
    borderWidth: 1,
    gap: 5,
  },
  periodTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8.5,
    borderRadius: 11,
  },
  periodTabText: {
    fontSize: 12,
  },
  metricHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  metricPeriodSub: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  metricTotalNumber: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  metricTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  metricTrendText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  metricTilesRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricTile: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  metricTileIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricTileLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  metricTileValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: 16,
    height: 105,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barDayText: {
    fontSize: 11,
  },
  emptyCardBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 12.5,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 17,
  },
  serviceRevRow: {
    marginBottom: 14,
  },
  srvHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  srvName: {
    fontSize: 13.5,
    fontWeight: "700",
    flex: 1,
    paddingRight: 10,
  },
  srvRev: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  srvCount: {
    fontSize: 11,
  },
  srvPctText: {
    fontSize: 11,
  },
  srvProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  srvProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  payoutRecordCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  payoutRecordIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(199, 243, 107, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  payoutRecordMethod: {
    fontSize: 13,
    fontWeight: "700",
  },
  payoutRecordDate: {
    fontSize: 11,
    marginTop: 2,
  },
  payoutRecordAmount: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  payoutStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  payoutStatusText: {
    fontSize: 9.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  modalContentWrap: {
    paddingTop: 6,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  presetAmountsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetChipText: {
    fontSize: 11.5,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: "900",
  },
  modalTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  methodOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodOptionText: {
    fontSize: 13,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalConfirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  statementHeroBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  statementHeroTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  statementHeroNumber: {
    fontSize: 26,
    fontWeight: "900",
  },
  statementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  statementLabel: {
    fontSize: 12.5,
  },
  statementVal: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 13,
    marginTop: 10,
  },
  exportBtnText: {
    fontSize: 13.5,
    fontWeight: "900",
  },
});
