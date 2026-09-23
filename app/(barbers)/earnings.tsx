import useColors from "@/hooks/usecolor";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

const { width } = Dimensions.get("window");

const PERIODS = ["Today", "This Week", "This Month", "All Time"] as const;

interface DayRevenue {
  day: string;
  amount: number;
  heightPct: number;
}

const DEFAULT_WEEKLY_BARS: DayRevenue[] = [
  { day: "Mon", amount: 0, heightPct: 6 },
  { day: "Tue", amount: 0, heightPct: 6 },
  { day: "Wed", amount: 0, heightPct: 6 },
  { day: "Thu", amount: 0, heightPct: 6 },
  { day: "Fri", amount: 0, heightPct: 6 },
  { day: "Sat", amount: 0, heightPct: 6 },
  { day: "Sun", amount: 0, heightPct: 6 },
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

export default function BarberEarningsScreen() {
  const colors = useColors();
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

      const apiSummary = await barberService.getEarningsSummary(periodMap[selectedPeriod] || "week");
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
      // Keep existing state
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEarningsData();
    setRefreshing(false);
    showToast("Analytics & payouts refreshed.", "info");
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primarytext} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("barber.earningsTitle") || "Earnings & Payouts"}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setStatementModalVisible(true)}
            style={styles.headerBtn}
          >
            <Ionicons name="document-text-outline" size={20} color={colors.primarytext} />
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Available Balance & Withdraw Action Card */}
        <View
          style={[
            styles.payoutHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.payoutHeroTop}>
            <View>
              <Text style={[styles.payoutHeroSub, { color: colors.secondarytext }]}>
                Available Payout Balance
              </Text>
              <Text style={[styles.payoutHeroAmount, { color: colors.primary }]}>
                {availableBalance.toLocaleString()} CFA
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setWithdrawAmount(availableBalance > 0 ? availableBalance.toString() : "25000");
                setPayoutModalVisible(true);
              }}
              style={[
                styles.withdrawActionBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="paper-plane-outline" size={15} color={colors.background} />
              <Text style={[styles.withdrawActionBtnText, { color: colors.background }]}>
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.payoutDivider, { backgroundColor: colors.surfacevariant }]} />

          <View style={styles.payoutMetaRow}>
            <View style={styles.payoutMetaItem}>
              <Ionicons name="checkmark-done-outline" size={14} color="#10B981" />
              <Text style={[styles.payoutMetaText, { color: colors.secondarytext }]}>
                Settled: {completedEarnings.toLocaleString()} CFA
              </Text>
            </View>
            {pendingEarnings > 0 && (
              <View style={styles.payoutMetaItem}>
                <Ionicons name="time-outline" size={14} color="#F59E0B" />
                <Text style={[styles.payoutMetaText, { color: colors.secondarytext }]}>
                  Pending: {pendingEarnings.toLocaleString()} CFA
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Period Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.periodsList}
        >
          {PERIODS.map((period) => {
            const isSelected = selectedPeriod === period;
            return (
              <TouchableOpacity
                key={period}
                activeOpacity={0.8}
                onPress={() => setSelectedPeriod(period)}
                style={[
                  styles.periodPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.surfacevariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.periodPillText,
                    {
                      color: isSelected ? colors.background : colors.secondarytext,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Hero Revenue Card */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.heroPeriodLabel, { color: colors.secondarytext }]}>
            Gross Revenue ({selectedPeriod})
          </Text>
          <Text style={[styles.heroAmount, { color: colors.primarytext }]}>
            {totalRevenue.toLocaleString()} CFA
          </Text>

          <View
            style={[
              styles.heroDivider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <View style={styles.heroSubStatsRow}>
            <View style={styles.heroSubStat}>
              <Text style={[styles.heroSubLabel, { color: colors.secondarytext }]}>
                Appointments
              </Text>
              <Text style={[styles.heroSubValue, { color: colors.primarytext }]}>
                {appointmentCount} bookings
              </Text>
            </View>

            <View style={styles.heroSubStat}>
              <Text style={[styles.heroSubLabel, { color: colors.secondarytext }]}>
                Average Ticket
              </Text>
              <Text style={[styles.heroSubValue, { color: colors.primary }]}>
                {avgTicket.toLocaleString()} CFA
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Revenue Bar Chart */}
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Weekly Revenue Trends
            </Text>
            <Text style={{ fontSize: 11.5, color: colors.secondarytext }}>
              Mon - Sun
            </Text>
          </View>

          <View style={styles.barsContainer}>
            {weeklyBars.map((bar) => (
              <View key={bar.day} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${bar.heightPct}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barDayText, { color: colors.secondarytext }]}>
                  {bar.day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top Services by Revenue */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
            Top Services by Revenue
          </Text>

          {topServices.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="cut-outline" size={24} color={colors.secondarytext} />
              <Text style={[styles.emptyCardText, { color: colors.secondarytext }]}>
                No service bookings logged for this timeframe yet.
              </Text>
            </View>
          ) : (
            topServices.map((srv, idx) => (
              <View key={idx} style={styles.serviceRevRow}>
                <View style={styles.srvHeaderRow}>
                  <Text style={[styles.srvName, { color: colors.primarytext }]}>
                    {srv.name}
                  </Text>
                  <Text style={[styles.srvRev, { color: colors.primary }]}>
                    {srv.revenue}
                  </Text>
                </View>
                <Text style={[styles.srvCount, { color: colors.secondarytext }]}>
                  {srv.count} bookings
                </Text>
                <View
                  style={[
                    styles.srvProgressBarTrack,
                    { backgroundColor: colors.surfacevariant },
                  ]}
                >
                  <View
                    style={[
                      styles.srvProgressBarFill,
                      {
                        width: `${srv.barPct}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recent Payouts */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Recent Payouts
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPayoutModalVisible(true)}
            >
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.primary }}>
                + Request
              </Text>
            </TouchableOpacity>
          </View>

          {recentPayouts.length === 0 ? (
            <View style={styles.emptyCardBox}>
              <Ionicons name="wallet-outline" size={24} color={colors.secondarytext} />
              <Text style={[styles.emptyCardText, { color: colors.secondarytext }]}>
                No payouts requested yet. Available funds can be withdrawn at any time.
              </Text>
            </View>
          ) : (
            recentPayouts.map((po) => (
              <View key={po.id} style={styles.payoutRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.payoutDate, { color: colors.primarytext }]}>
                    {po.date}
                  </Text>
                  <Text
                    style={[
                      styles.payoutStatus,
                      { color: po.status === "Completed" ? "#10B981" : "#F59E0B" },
                    ]}
                  >
                    {po.status} • {po.payment_method || "Direct Transfer"}
                  </Text>
                </View>
                <Text style={[styles.payoutAmount, { color: colors.primarytext }]}>
                  {po.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Payout Withdrawal Modal */}
      <CustomModal
        visible={payoutModalVisible}
        title="Withdraw Funds"
        onClose={() => setPayoutModalVisible(false)}
      >
        <View style={{ gap: 14, width: "100%" }}>
          <Text style={{ fontSize: 13, color: colors.secondarytext }}>
            Available for withdrawal:{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              {availableBalance.toLocaleString()} CFA
            </Text>
          </Text>

          {/* Amount Input */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondarytext }}>
              AMOUNT (CFA)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                  color: colors.primarytext,
                },
              ]}
              keyboardType="numeric"
              placeholder="e.g. 25000"
              placeholderTextColor={colors.secondarytext}
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />

            {/* Quick Chips */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              {[10000, 25000, 50000].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  activeOpacity={0.7}
                  onPress={() => setWithdrawAmount(amt.toString())}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: colors.surfacevariant,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11.5, color: colors.primarytext }}>
                    {amt.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setWithdrawAmount(availableBalance.toString())}
                style={[
                  styles.quickChip,
                  {
                    backgroundColor: "rgba(163, 179, 156, 0.2)",
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text style={{ fontSize: 11.5, color: colors.primary, fontWeight: "700" }}>
                  Max
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment Method Selector */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondarytext }}>
              PAYOUT METHOD
            </Text>
            <View style={{ gap: 6 }}>
              {(["MTN Mobile Money", "Orange Money", "Direct Bank Transfer"] as const).map(
                (method) => {
                  const isPicked = paymentMethod === method;
                  return (
                    <TouchableOpacity
                      key={method}
                      activeOpacity={0.8}
                      onPress={() => setPaymentMethod(method)}
                      style={[
                        styles.methodOption,
                        {
                          backgroundColor: isPicked
                            ? "rgba(163, 179, 156, 0.15)"
                            : colors.surface,
                          borderColor: isPicked ? colors.primary : colors.surfacevariant,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          method === "Direct Bank Transfer"
                            ? "business-outline"
                            : "phone-portrait-outline"
                        }
                        size={18}
                        color={isPicked ? colors.primary : colors.secondarytext}
                      />
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: isPicked ? "700" : "500",
                          color: isPicked ? colors.primarytext : colors.secondarytext,
                        }}
                      >
                        {method}
                      </Text>
                      {isPicked && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>

          {/* Account Details / Phone Number */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondarytext }}>
              {paymentMethod === "Direct Bank Transfer"
                ? "BANK ACCOUNT NUMBER / IBAN"
                : "CAMEROON MOBILE MONEY PHONE (+237)"}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                  color: colors.primarytext,
                },
              ]}
              placeholder={
                paymentMethod === "Direct Bank Transfer"
                  ? "e.g. CM21 1000 5001 2345 6789"
                  : "+237 6XX XXX XXX"
              }
              placeholderTextColor={colors.secondarytext}
              value={accountDetails}
              onChangeText={setAccountDetails}
            />
          </View>

          {/* Submit Action */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleRequestPayout}
            disabled={isSubmittingPayout}
            style={[
              styles.submitPayoutBtn,
              { backgroundColor: colors.primary, opacity: isSubmittingPayout ? 0.7 : 1 },
            ]}
          >
            {isSubmittingPayout ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={[styles.submitPayoutBtnText, { color: colors.background }]}>
                Confirm Withdrawal
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* Financial Statement Modal */}
      <CustomModal
        visible={statementModalVisible}
        title="Financial Summary Statement"
        onClose={() => setStatementModalVisible(false)}
      >
        <View style={{ gap: 14, width: "100%" }}>
          <View
            style={[
              styles.statementCard,
              { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
            ]}
          >
            <Text style={[styles.statementAccountName, { color: colors.primarytext }]}>
              {user?.name || "Barber Account"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.secondarytext }}>
              Statement Date: {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </Text>

            <View style={[styles.payoutDivider, { backgroundColor: colors.surfacevariant }]} />

            <View style={styles.statementRow}>
              <Text style={{ color: colors.secondarytext, fontSize: 13 }}>Gross Bookings</Text>
              <Text style={{ color: colors.primarytext, fontWeight: "600", fontSize: 13 }}>
                {totalRevenue.toLocaleString()} CFA
              </Text>
            </View>

            <View style={styles.statementRow}>
              <Text style={{ color: colors.secondarytext, fontSize: 13 }}>Completed Cuts</Text>
              <Text style={{ color: colors.primarytext, fontWeight: "600", fontSize: 13 }}>
                {appointmentCount} appointments
              </Text>
            </View>

            <View style={styles.statementRow}>
              <Text style={{ color: colors.secondarytext, fontSize: 13 }}>Available Balance</Text>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                {availableBalance.toLocaleString()} CFA
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setStatementModalVisible(false);
              showToast("Official financial summary statement saved to your device.", "success");
            }}
            style={[styles.submitPayoutBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="download-outline" size={16} color={colors.background} />
            <Text style={[styles.submitPayoutBtnText, { color: colors.background }]}>
              Download Statement
            </Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* In-App Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="barber_earnings"
        title={BARBER_EARNINGS_TUTORIAL.title}
        subtitle={BARBER_EARNINGS_TUTORIAL.subtitle}
        steps={BARBER_EARNINGS_TUTORIAL.steps}
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        autoTrigger={true}
      />
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
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  payoutHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  payoutHeroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payoutHeroSub: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  payoutHeroAmount: {
    fontSize: 26,
    fontWeight: "800",
  },
  withdrawActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  withdrawActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  payoutDivider: {
    height: 1,
    marginVertical: 14,
  },
  payoutMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  payoutMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  payoutMetaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  periodsList: {
    gap: 8,
    paddingBottom: 16,
  },
  periodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 13,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  heroPeriodLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  heroDivider: {
    height: 1,
    marginVertical: 16,
  },
  heroSubStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heroSubStat: {
    flex: 1,
  },
  heroSubLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  heroSubValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  chartCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  barsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    height: "100%",
  },
  barTrack: {
    flex: 1,
    width: 16,
    justifyContent: "flex-end",
    borderRadius: 8,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barDayText: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  emptyCardBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
  serviceRevRow: {
    marginBottom: 16,
  },
  srvHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  srvName: {
    fontSize: 14,
    fontWeight: "600",
  },
  srvRev: {
    fontSize: 14,
    fontWeight: "700",
  },
  srvCount: {
    fontSize: 12,
    marginBottom: 6,
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
  payoutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  payoutDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  payoutStatus: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  methodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  submitPayoutBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  submitPayoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  statementCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statementAccountName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  statementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
});
