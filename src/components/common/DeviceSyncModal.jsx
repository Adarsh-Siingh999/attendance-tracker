import { useState, useEffect } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { Badge } from "./Badge.jsx";
import { IconCheck, IconShare } from "./Icons.jsx";
import {
  generateDeviceSyncUrl,
  generateFreshAppShareUrl,
  getQrCodeImageUrl,
  triggerNativeShare,
  shareLiveAttendanceCondition,
  shareFreshAppToNewUser,
} from "../../services/crossDeviceSyncService.js";
import { useApp } from "../../context/AppContext.jsx";

export function DeviceSyncModal({ isOpen, onClose, initialMode = "live" }) {
  const { profile, activeSemester, overall, subjects, attendanceRecords } = useApp();

  const [activeTab, setActiveTab] = useState(initialMode); // "live" | "fresh"
  const [syncUrl, setSyncUrl] = useState("");
  const [freshUrl, setFreshUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrSize] = useState(200);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode || "live");
      setFreshUrl(generateFreshAppShareUrl());
    }
  }, [isOpen, initialMode]);

  // Generate live sync URL when modal opens or when records change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    generateDeviceSyncUrl().then((res) => {
      if (isMounted) {
        setSyncUrl(res.url);
        setIsGenerating(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, attendanceRecords, subjects, profile]);

  const currentUrl = activeTab === "live" ? syncUrl : freshUrl;

  const handleCopy = async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleShare = async () => {
    if (activeTab === "live") {
      const res = await shareLiveAttendanceCondition({
        studentName: profile?.fullName,
        overallPercentage: overall?.percentage,
      });
      if (res.copied) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } else {
      const res = await shareFreshAppToNewUser();
      if (res.copied) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  };

  const qrImageUrl = currentUrl ? getQrCodeImageUrl(currentUrl, qrSize) : "";

  // Count recorded dates
  const semesterRecords = attendanceRecords || {};
  const datesCount = Object.keys(semesterRecords).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeTab === "live" ? "📱 Share Live Condition (Device Sync)" : "🚀 Share Fresh Web App (For Someone New)"}
      maxWidth="620px"
    >
      <div className="device-sync-modal-body">
        {/* DUAL SHARING MODE NAVIGATION TABS */}
        <div className="sync-nav-tabs">
          <button
            type="button"
            className={`sync-tab-btn ${activeTab === "live" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("live");
              setCopied(false);
            }}
          >
            📊 Share Live Condition
          </button>
          <button
            type="button"
            className={`sync-tab-btn ${activeTab === "fresh" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("fresh");
              setCopied(false);
            }}
          >
            ✨ Share Fresh App (New User)
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* MODE 1: SHARE LIVE CONDITION                                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === "live" ? (
          <>
            {/* LIVE CONDITION SNAPSHOT CARD */}
            <div className="sync-snapshot-banner">
              <div className="snapshot-header">
                <div className="snapshot-user">
                  <span className="user-initials-badge">{profile?.avatarInitials || "AS"}</span>
                  <div>
                    <strong>{profile?.fullName || "Student"}</strong>
                    <span className="snapshot-sub">
                      {profile?.institution || "Galgotias University"} • {activeSemester?.name || "Semester"}
                    </span>
                  </div>
                </div>
                <Badge variant={overall?.percentage >= 75 ? "success" : "danger"} size="md">
                  {overall?.percentage ? overall.percentage.toFixed(1) : "0.0"}% Overall
                </Badge>
              </div>

              <div className="snapshot-metrics-row">
                <div className="metric-chip">
                  <span className="metric-lbl">Tracked Courses</span>
                  <strong className="metric-val">{subjects?.length || 0}</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-lbl">Marked Attendance</span>
                  <strong className="metric-val">{datesCount} days</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-lbl">Live Condition</span>
                  <strong className="metric-val text-success">Up to Date ✓</strong>
                </div>
              </div>
            </div>

            <p className="sync-desc">
              Share this live condition link or scan the QR code on your <strong>laptop, iPad, or another phone</strong>.
              The other device will immediately mirror your exact courses, schedule, and attendance marks!
            </p>
          </>
        ) : (
          /* ------------------------------------------------------------- */
          /* MODE 2: SHARE FRESH WEB APP FOR SOMEONE NEW (ZERO PROFILES)   */
          /* ------------------------------------------------------------- */
          <>
            <div className="sync-snapshot-banner" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)", borderColor: "#bfdbfe" }}>
              <div className="snapshot-header">
                <div className="snapshot-user">
                  <span className="user-initials-badge" style={{ background: "#3b82f6", color: "#ffffff" }}>✨</span>
                  <div>
                    <strong>Clean Slate Web App Link</strong>
                    <span className="snapshot-sub">
                      Zero Profiles • Ready for New User Registration
                    </span>
                  </div>
                </div>
                <Badge variant="primary" size="md">
                  0 Profiles Shared
                </Badge>
              </div>

              <div className="snapshot-metrics-row" style={{ borderColor: "#bfdbfe" }}>
                <div className="metric-chip">
                  <span className="metric-lbl">Recipient Experience</span>
                  <strong className="metric-val text-primary">Clean Start</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-lbl">Existing Profiles</span>
                  <strong className="metric-val">0 (Completely Fresh)</strong>
                </div>
                <div className="metric-chip">
                  <span className="metric-lbl">Privacy Guarantee</span>
                  <strong className="metric-val text-success">100% Private 🔒</strong>
                </div>
              </div>
            </div>

            <p className="sync-desc">
              Send this clean link to a <strong>friend, classmate, or peer</strong>.
              When they open it, the app will open completely fresh with <strong>zero profiles</strong> so they can create their own account and track their personal attendance from scratch.
            </p>
          </>
        )}

        {/* QR CODE DISPLAY */}
        <div className="sync-qr-section">
          <div className="qr-container">
            {isGenerating && activeTab === "live" ? (
              <div className="qr-loading-placeholder">
                <span className="spinner-sm" />
                <span>Generating live sync link...</span>
              </div>
            ) : qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt={activeTab === "live" ? "Scan to open live condition" : "Scan to open fresh web app"}
                className="sync-qr-image"
                width={qrSize}
                height={qrSize}
              />
            ) : null}
          </div>
          <span className="qr-hint">
            {activeTab === "live"
              ? "📷 Scan with your laptop or phone camera to mirror your attendance"
              : "📷 Friend can scan this code to open AttendanceFlow fresh with 0 profiles"}
          </span>
        </div>

        {/* SHARE LINK BOX */}
        <div className="sync-link-box">
          <label className="form-label">
            {activeTab === "live" ? "Live Condition Link (Encrypted State)" : "Fresh Web App Link (For Someone New)"}
          </label>
          <div className="link-copy-row">
            <input
              type="text"
              readOnly
              value={isGenerating && activeTab === "live" ? "Generating link..." : currentUrl}
              className="form-input sync-url-input"
              onClick={(e) => e.target.select()}
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleCopy}
              disabled={(isGenerating && activeTab === "live") || !currentUrl}
            >
              {copied ? <IconCheck size={16} /> : null}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<IconShare size={16} />}
              onClick={handleShare}
              disabled={(isGenerating && activeTab === "live") || !currentUrl}
              title={activeTab === "live" ? "Share Live Condition" : "Share Fresh App to Friend"}
            >
              {activeTab === "live" ? "Share Live" : "Share Fresh"}
            </Button>
          </div>
        </div>

        {/* INFO FOOTER */}
        <div className="sync-info-box">
          <strong>💡 {activeTab === "live" ? "How does Live Sync work?" : "Why share a Fresh Link?"}</strong>
          <ul className="sync-info-list">
            {activeTab === "live" ? (
              <>
                <li>
                  <strong>Direct Snapshot</strong>: Your live subjects, schedule, and attendance marks are compressed directly into the link.
                </li>
                <li>
                  <strong>Mirror Across Devices</strong>: When opened on your laptop or tablet, it automatically mirrors your profile and loads your current attendance percentage.
                </li>
                <li>
                  <strong>Works Anywhere</strong>: Works across Android, iPhone, Mac, Windows, and Linux browsers with zero setup.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Zero Profiles Guarantee</strong>: The recipient starts with a clean slate (zero existing profiles) so their dashboard is not cluttered with your records.
                </li>
                <li>
                  <strong>Direct to Registration</strong>: They will be greeted by the registration screen to enter their name, college, and branch.
                </li>
                <li>
                  <strong>Total Privacy</strong>: Your personal attendance, grades, and profile remain completely private on your device.
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="modal-actions-row">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
