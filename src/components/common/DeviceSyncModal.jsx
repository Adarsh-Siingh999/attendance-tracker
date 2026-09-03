import { useState, useEffect } from "react";
import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { Badge } from "./Badge.jsx";
import { IconCheck, IconShare, IconDownload } from "./Icons.jsx";
import {
  generateDeviceSyncUrl,
  getQrCodeImageUrl,
  triggerNativeShare,
} from "../../services/crossDeviceSyncService.js";
import { useApp } from "../../context/AppContext.jsx";

export function DeviceSyncModal({ isOpen, onClose }) {
  const { profile, activeSemester, overall, subjects, attendanceRecords } = useApp();

  const [syncUrl, setSyncUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrSize] = useState(200);

  // Generate sync URL when modal opens or when records change
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

  const handleCopy = async () => {
    if (!syncUrl) return;
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.warn("Clipboard write failed:", e);
    }
  };

  const handleShare = async () => {
    if (!syncUrl) return;
    const res = await triggerNativeShare(
      syncUrl,
      `${profile.fullName || "My"} Attendance Tracker`,
      `Here is my live, up-to-date attendance schedule and records (${overall.percentage.toFixed(1)}%):`
    );

    if (res.copied) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const qrImageUrl = syncUrl ? getQrCodeImageUrl(syncUrl, qrSize) : "";

  // Count recorded dates
  const semesterRecords = attendanceRecords || {};
  const datesCount = Object.keys(semesterRecords).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📲 Sync Live Condition to Other Devices" maxWidth="620px">
      <div className="device-sync-modal-body">
        {/* CURRENT LIVE CONDITION SUMMARY CARD */}
        <div className="sync-snapshot-banner">
          <div className="snapshot-header">
            <div className="snapshot-user">
              <span className="user-initials-badge">{profile.avatarInitials || "AS"}</span>
              <div>
                <strong>{profile.fullName || "Student"}</strong>
                <span className="snapshot-sub">
                  {profile.institution || "Galgotias University"} • {activeSemester.name}
                </span>
              </div>
            </div>
            <Badge variant={overall.percentage >= 75 ? "success" : "danger"} size="md">
              {overall.percentage.toFixed(1)}% Overall
            </Badge>
          </div>

          <div className="snapshot-metrics-row">
            <div className="metric-chip">
              <span className="metric-lbl">Tracked Courses</span>
              <strong className="metric-val">{subjects.length}</strong>
            </div>
            <div className="metric-chip">
              <span className="metric-lbl">Marked Attendance Days</span>
              <strong className="metric-val">{datesCount} days</strong>
            </div>
            <div className="metric-chip">
              <span className="metric-lbl">Live Condition</span>
              <strong className="metric-val text-success">Up to Date ✓</strong>
            </div>
          </div>
        </div>

        <p className="sync-desc">
          Share this link or scan the QR code on your <strong>laptop, iPad, or another phone</strong>.
          The other device will immediately open this exact, up-to-date state with all your subjects and attendance marks!
        </p>

        {/* QR CODE DISPLAY */}
        <div className="sync-qr-section">
          <div className="qr-container">
            {isGenerating ? (
              <div className="qr-loading-placeholder">
                <span className="spinner-sm" />
                <span>Generating live sync link...</span>
              </div>
            ) : qrImageUrl ? (
              <img
                src={qrImageUrl}
                alt="Scan to open on other device"
                className="sync-qr-image"
                width={qrSize}
                height={qrSize}
              />
            ) : null}
          </div>
          <span className="qr-hint">
            📷 Point your laptop or other phone&apos;s camera at this QR code to open instantly
          </span>
        </div>

        {/* SHARE LINK BOX */}
        <div className="sync-link-box">
          <label className="form-label">Instant Sync Link</label>
          <div className="link-copy-row">
            <input
              type="text"
              readOnly
              value={isGenerating ? "Generating link..." : syncUrl}
              className="form-input sync-url-input"
              onClick={(e) => e.target.select()}
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleCopy}
              disabled={isGenerating || !syncUrl}
            >
              {copied ? <IconCheck size={16} /> : null}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={<IconShare size={16} />}
              onClick={handleShare}
              disabled={isGenerating || !syncUrl}
              title="Share via WhatsApp, Messages, or AirDrop"
            >
              Share
            </Button>
          </div>
        </div>

        {/* HOW IT WORKS / FAQ ACCORDION */}
        <div className="sync-info-box">
          <strong>💡 How does this work?</strong>
          <ul className="sync-info-list">
            <li>
              <strong>Direct Encryption</strong>: Your live subjects, schedule, and attendance marks are compressed directly into the link.
            </li>
            <li>
              <strong>Zero Setup on New Device</strong>: When opened on your laptop or tablet, it automatically sets up your profile and loads your current attendance percentage.
            </li>
            <li>
              <strong>Cross-Device Friendly</strong>: Works across Android, iPhone, Mac, Windows, and Linux browsers with zero login barriers.
            </li>
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
