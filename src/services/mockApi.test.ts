import { describe, expect, it, vi } from "vitest";
import { createMockApi } from "./mockApi";

describe("local AirSense data", () => {
  it("supports user and administrator flows without making network requests", async () => {
    let token: string | null = null;
    const api = createMockApi({
      getAuthToken: () => token,
      setAuthToken: (value) => {
        token = value;
      },
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const user = await api.login({ email: "student@airsense.edu.pk", password: "" });
      expect(user.user.role).toBe("user");
      expect((await api.getMe()).email).toBe("student@airsense.edu.pk");
      expect((await api.getCurrent()).aqi).toBeGreaterThan(0);
      expect((await api.getHistory(12)).points).toHaveLength(12);
      expect((await api.getForecast(6)).points).toHaveLength(6);
      expect((await api.getGuidance("Moderate")).items.length).toBeGreaterThan(0);

      const admin = await api.login({ email: "admin@airsense.edu.pk", password: "" });
      expect(admin.user.role).toBe("admin");
      expect((await api.getAdminOverview()).data.source_status).toBe("sample");
      expect((await api.getAdminUsers("", 1, 10)).items.length).toBeGreaterThan(0);
      expect((await api.getAdminAlerts()).length).toBeGreaterThan(0);
      expect((await api.getThresholds()).warning).toBeGreaterThan(0);
      expect((await api.getAuditLogs()).items.length).toBeGreaterThan(0);
      expect((await api.markAlertRead(1)).ok).toBe(true);
      const createdAlert = await api.createAdminAlert({
        severity: "info",
        title: "Test notice",
        message: "Sample notice",
      });
      expect((await api.deactivateAdminAlert(createdAlert.id)).active).toBe(false);
      expect((await api.updateThresholds({ warning: 110, danger: 160 })).danger).toBe(160);
      expect((await api.refreshData()).fetched).toBeGreaterThan(0);
      expect((await api.retrainModel()).status).toBe("done");
      expect((await api.getModelStatus()).status).toBe("done");
      expect((await api.exportReadings()).type).toContain("text/csv");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
