import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, BarChart3, PlayCircle, Layers, Download } from "lucide-react";
import { API_BASE_URL } from "../service/service";

const themeColor = "#012834";

export default function VersionSidebar({
  modelId,
  onViewStats,    // (versionNumber) => void
  onUseVersion,   // (versionNumber, { onAfterSuccess }) => void
  userType,
}) {
  // console.log(userType);
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState(null);
  const [error, setError] = useState(null);

  const fetchActive = async (id) => {
    const res = await fetch(`${API_BASE_URL}/api/version/get_use/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch active version (HTTP ${res.status})`);
    const data = await res.json();
    // Expected: { status: "Success", model_version: <number> }
    return data?.status === "Success" ? data.model_version ?? null : null;
  };

  // Fetch versions + active on modelId change
  useEffect(() => {
    let live = true;
    const run = async () => {
      if (!modelId) return;
      setLoading(true);
      setError(null);
      try {
        const [vRes, activeNum] = await Promise.all([
          fetch(`${API_BASE_URL}/api/version/${modelId}`),
          fetchActive(modelId),
        ]);
        if (!vRes.ok) throw new Error(`Failed to fetch versions (HTTP ${vRes.status})`);
        const vData = await vRes.json();
        if (live) {
          setVersions(Array.isArray(vData?.versions) ? vData.versions : []);
          setActiveVersionNumber(activeNum);
        }
      } catch (e) {
        if (live) setError(e.message || String(e));
      } finally {
        if (live) setLoading(false);
      }
    };
    run();
    return () => { live = false; };
  }, [modelId]);

  const handleView = (vnum) => onViewStats?.(vnum);

  const handleUse = (vnum) => {
    // Parent does the POST use call. After success, we refresh active via get_use.
    onUseVersion?.(vnum, {
      onAfterSuccess: async () => {
        try {
          const activeNum = await fetchActive(modelId);
          setActiveVersionNumber(activeNum);
        } catch (e) {
          // optional: toast/log
          console.error("Failed to refresh active version:", e);
        }
      }
    });
  };

  // const handleDownload = async (vnum) => {
  //   try {
  //     const res = await fetch(
  //       `${API_BASE_URL}/model_config/model_download?model_id=${modelId}&version=${vnum}`,
  //       {
  //         method: "GET",
  //       }
  //     );

  //     if (!res.ok) {
  //       throw new Error(`Download failed (HTTP ${res.status})`);
  //     }

  //     // Get filename from Content-Disposition header (if present)
  //     const disposition = res.headers.get("content-disposition");
  //     let filename = `model_v${vnum}.onnx`;

  //     if (disposition) {
  //       const match = disposition.match(/filename="?(.+?)"?$/);
  //       if (match && match[1]) filename = match[1];
  //     }

  //     const blob = await res.blob();
  //     const url = window.URL.createObjectURL(blob);

  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = filename;
  //     document.body.appendChild(a);
  //     a.click();

  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error("Model download error:", err);
  //     alert("Failed to download model file");
  //   }
  // };

  const handleDownload = (vnum) => {
    const url = `${API_BASE_URL}/model_config/model_download?model_id=${modelId}&version=${vnum}`;
    window.open(url, "_blank");
  };

  if (!loading && versions.length <= 1) {
    return null;
  }

  return (
    <aside
      className="w-full lg:w-72 xl:w-80 shrink-0"
      style={{ maxHeight: '100%' }}
    >
      <div
        className="bg-white rounded-xl shadow p-4 border flex flex-col"
        style={{
          borderColor: themeColor + "30",
          height: 'calc(100vh - 180px)'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5" style={{ color: themeColor }} />
          <h3 className="text-base font-semibold" style={{ color: themeColor }}>Model Versions</h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading versions…
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">Error: {error}</div>
        ) : versions.length === 0 ? (
          <div className="text-sm text-gray-600">No versions found.</div>
        ) : (
          // <ul className="space-y-2 overflow-y-auto pr-1 flex-1 scroll-smooth">
          <ul className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
            {versions.map((v) => {
              const vnum = v.version_number;
              const createdAt = v.created_at ? new Date(v.created_at).toLocaleString() : "-";
              const isActive = Number(activeVersionNumber) === Number(vnum);

              return (
                <li key={vnum} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors" style={{ borderColor: themeColor + "20" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Version {vnum}</div>
                      <div className="text-xs text-gray-500">Created: {createdAt}</div>
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: themeColor + "10", color: themeColor }}>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleView(vnum)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90"
                      style={{ backgroundColor: themeColor }}
                      title="View stats for this version"
                    >
                      <BarChart3 className="w-4 h-4" /> View stats
                    </button>
                    {/* Hide Use when this version is the active one */}
                    {!isActive && (userType === 'admin' || userType === 'superadmin') && (
                      <button
                        onClick={() => handleUse(vnum)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90"
                        style={{ backgroundColor: "#16a34a" }}
                      >
                        <PlayCircle className="w-4 h-4" /> Use
                      </button>
                    )}
                    {(userType === 'admin' || userType === 'superadmin') && (
                      <button
                        onClick={() => handleDownload(vnum)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium hover:opacity-90"
                        style={{ backgroundColor: "#2596be" }}
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}