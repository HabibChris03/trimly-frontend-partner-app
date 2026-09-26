import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] App crashed:", error?.message);
    console.error("[ErrorBoundary] Stack:", error?.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>Error Details (share this with support):</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.error}>
              {this.state.error?.message ?? "Unknown error"}
            </Text>
            <Text style={styles.stack}>
              {this.state.error?.stack ?? ""}
            </Text>
            <Text style={styles.stack}>
              {this.state.errorInfo?.componentStack ?? ""}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1C1E1B",
    padding: 24,
    paddingTop: 60,
  },
  title: {
    color: "#FF6B6B",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A3B39C",
    fontSize: 14,
    marginBottom: 12,
  },
  scroll: {
    flex: 1,
    backgroundColor: "#2a2c29",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  stack: {
    color: "#ccc",
    fontSize: 11,
    fontFamily: "monospace",
  },
  button: {
    backgroundColor: "#A3B39C",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#1C1E1B",
    fontWeight: "bold",
    fontSize: 16,
  },
});
