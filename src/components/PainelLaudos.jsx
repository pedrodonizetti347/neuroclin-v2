import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const GAS_URL = "https://script.google.com/macros/s/AKfycbyFjC5joHY6rVZ3mG1OvREuiO3zlh75q8LhhhQ5s2boDOb6CNC1IqFgsGq9L4ttQApU/exec";

const STATUS_CONFIG = {
  aguardando_anamnese:   { label: "Aguardando anamnese",   cor: "#ef4444", bg: "#fef2f2", borda: "#fecaca", btnLabel: "Anamnese OK",      emoji: "🔴" },
  aguardando_correcao:   { label: "Aguardando correção",   cor: "#f97316", bg: "#fff7ed", borda: "#fed7aa", btnLabel: "Corrigido",         emoji: "🟠" },
  aguardando_supervisao: { label: "Aguardando supervisão", cor: "#eab308", bg: "#fefce8", borda: "#fde047", btnLabel: "Supervisionado",    emoji: "🟡" },
  pronto_impressao:      { label: "Pronto para impressão", cor: "#22c55e", bg: "#f0fdf4", borda: "#86efac", btnLabel: null,                emoji: "✅" },
};

const STATUS_PROXIMO = {
  aguardando_anamnese:   "aguardando_correcao",
  aguardando_correcao:   "aguardando_supervisao",
  aguardando_supervisao: "pronto_impressao",
  pronto_impressao:      null,
};

function formatoPD(d) {
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

function amanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function somarDias(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function parsePD(str) {
  if (!str) return null;
  const p = str.split("/");
  if (p.length < 3) return null;
  return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
}

function isSameDay(d1, d2) {
  return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
}

function labelDia(dataStr) {
  const d = parsePD(dataStr);
  if (!d) return dataStr;
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

// Normaliza nome para comparação: remove acentos, maiúsculas, espaços duplos
const normName = (n) =>
  (n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim().replace(/\s+/g, ' ');

// Etapas que indicam "concluído pelo estagiário"
const ETAPAS_CONCLUIDAS = new Set(['aguardando_aprovacao', 'pronto_devolutiva']);

export default function PainelLaudos() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isProfessional = user?.role === 'professional' || user?.role === 'entregador';

  const [laudos, setLaudos] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [proximosAberto, setProximosAberto] = useState(false);
  const [salvando, setSalvando] = useState({});
  // Mapa nome normalizado → { patientId, testesOk }
  const [testStatusMap, setTestStatusMap] = useState({});

  // Carrega patients + correcoes para verificar status dos testes (só para professional)
  useEffect(() => {
    if (!isProfessional) return;
    (async () => {
      try {
        const [pSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'patients')),
          getDocs(collection(db, 'correcoes')),
        ]);
        const patients  = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const correcoes = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Monta mapa: patientId → [correcoes]
        const corrByPatient = {};
        correcoes.forEach(c => {
          const pid = c.patientId || c.pacienteId;
          if (!pid) return;
          if (!corrByPatient[pid]) corrByPatient[pid] = [];
          corrByPatient[pid].push(c);
        });

        // Monta mapa: nomeNormalizado → testesOk
        const map = {};
        patients.forEach(p => {
          const key = normName(p.full_name);
          const corrs = corrByPatient[p.id] || [];
          const testesOk = corrs.length === 0
            ? true // sem correções cadastradas — não bloqueia
            : corrs.every(c => ETAPAS_CONCLUIDAS.has(c.etapaAtual));
          map[key] = { patientId: p.id, testesOk };
        });
        setTestStatusMap(map);
      } catch (e) {
        console.warn('[PainelLaudos] testStatusMap:', e.message);
      }
    })();
  }, [isProfessional]);

  const statusKey = (paciente, data) => `${paciente}||${data}`;
  const getStatus = (paciente, data) => statusMap[statusKey(paciente, data)] || "aguardando_anamnese";

  const carregarStatus = useCallback(async () => {
    try {
      const r = await fetch(`${GAS_URL}?action=getlaudostatus`);
      const data = await r.json();
      if (Array.isArray(data)) {
        const map = {};
        data.forEach((rec) => { map[statusKey(rec.paciente, rec.data)] = rec.status; });
        setStatusMap(map);
      }
    } catch (e) {
      console.error("Erro ao carregar status:", e);
    }
  }, []);

  const carregarLaudos = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const ini = formatoPD(amanha());
      const fim = formatoPD(somarDias(7));
      const url = `${GAS_URL}?action=getlaudos&dataInicial=${ini}&dataFinal=${fim}`;
      const [rLaudos] = await Promise.all([fetch(url), carregarStatus()]);
      const data = await rLaudos.json();
      if (data.erro) throw new Error(data.mensagem || "Erro ao buscar laudos");
      setLaudos(data.laudos || []);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, [carregarStatus]);

  useEffect(() => {
    carregarLaudos();
    const interval = setInterval(carregarLaudos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [carregarLaudos]);

  const avancarStatus = async (paciente, data) => {
    const atual = getStatus(paciente, data);
    const novo = STATUS_PROXIMO[atual];
    if (!novo) return;

    setStatusMap((prev) => ({ ...prev, [statusKey(paciente, data)]: novo }));
    setSalvando((prev) => ({ ...prev, [statusKey(paciente, data)]: true }));

    try {
      const payload = encodeURIComponent(JSON.stringify({ paciente, data, status: novo, updatedBy: "neuroclin" }));
      await fetch(`${GAS_URL}?action=savelaudostatus&data=${payload}`);
    } catch (e) {
      console.error("Erro ao salvar status:", e);
    } finally {
      setSalvando((prev) => ({ ...prev, [statusKey(paciente, data)]: false }));
    }
  };

  const amanhaDate = amanha();

  const laudosAmanha = laudos
    .filter((l) => { const d = parsePD(l.data); return d && isSameDay(d, amanhaDate); })
    .sort((a, b) => {
      const sa = getStatus(a.paciente, a.data) === "pronto_impressao" ? 1 : 0;
      const sb = getStatus(b.paciente, b.data) === "pronto_impressao" ? 1 : 0;
      if (sa !== sb) return sa - sb;
      return (a.hora || "") < (b.hora || "") ? -1 : 1;
    });

  const laudosProximos = laudos.filter((l) => {
    const d = parsePD(l.data);
    return d && !isSameDay(d, amanhaDate);
  });

  const prontos = laudosAmanha.filter((l) => getStatus(l.paciente, l.data) === "pronto_impressao").length;
  const total = laudosAmanha.length;
  const pct = total > 0 ? Math.round((prontos / total) * 100) : 100;
  const todosOk = total === 0 || prontos === total;

  const proximosGrupados = {};
  laudosProximos.forEach((l) => {
    if (!proximosGrupados[l.data]) proximosGrupados[l.data] = [];
    proximosGrupados[l.data].push(l);
  });
  const proximasDatas = Object.keys(proximosGrupados).sort();

  const labelAmanha = amanhaDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", maxWidth: 740, margin: "0 auto", padding: "0 16px 32px" }}>

      {/* ── CABEÇALHO ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>
            📋 Laudos para amanhã
          </div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, textTransform: "capitalize" }}>
            Prevent Senior — {labelAmanha}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, borderRadius: 20, padding: "4px 12px",
            background: todosOk ? "#f0fdf4" : "#eff6ff",
            color: todosOk ? "#16a34a" : "#2563eb",
            border: `1px solid ${todosOk ? "#86efac" : "#bfdbfe"}`,
          }}>
            {loading ? "—" : `${prontos}/${total} concluídos`}
          </span>
          <button
            onClick={carregarLaudos}
            style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 14, color: "#6b7280" }}
            title="Atualizar"
          >↺</button>
        </div>
      </div>

      {/* ── BARRA DE PROGRESSO ── */}
      <div style={{ background: "#f3f4f6", borderRadius: 6, height: 6, marginBottom: 16, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 6,
          background: todosOk ? "#22c55e" : "linear-gradient(90deg, #3b82f6, #06b6d4)",
          width: `${pct}%`, transition: "width 0.5s ease",
        }} />
      </div>

      {/* ── LISTA AMANHÃ ── */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, padding: "28px 0" }}>
          Carregando laudos do ProDoctor...
        </div>
      ) : erro ? (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 14px", color: "#dc2626", fontSize: 13 }}>
          ⚠️ {erro}
        </div>
      ) : laudosAmanha.length === 0 ? (
        <div style={{ textAlign: "center", color: "#22c55e", fontSize: 14, fontWeight: 600, padding: "20px 0" }}>
          ✅ Nenhum laudo Prevent Senior para amanhã
        </div>
      ) : (
        laudosAmanha.map((l) => {
          const st = getStatus(l.paciente, l.data);
          const cfg = STATUS_CONFIG[st];
          const isSalvando = salvando[statusKey(l.paciente, l.data)];
          return (
            <div
              key={`${l.paciente}-${l.data}`}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.borda}`,
                borderLeft: `4px solid ${cfg.cor}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 8,
                transition: "all 0.2s",
              }}
            >
              {/* Linha principal: info + badge + botão de avanço */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {l.paciente}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    {l.hora}{l.profissional ? ` · ${l.profissional}` : ""}
                  </div>
                </div>

                <span style={{
                  fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "3px 10px",
                  background: "#fff", color: cfg.cor, border: `1px solid ${cfg.borda}`,
                  whiteSpace: "nowrap",
                }}>
                  {cfg.emoji} {cfg.label}
                </span>

                {cfg.btnLabel && !isProfessional && (
                  <button
                    onClick={() => avancarStatus(l.paciente, l.data)}
                    disabled={isSalvando}
                    style={{
                      background: isSalvando ? "#e5e7eb" : "#1d4ed8",
                      color: isSalvando ? "#9ca3af" : "#fff",
                      border: "none", borderRadius: 7,
                      padding: "6px 12px", fontSize: 12, fontWeight: 500,
                      cursor: isSalvando ? "default" : "pointer",
                      whiteSpace: "nowrap", transition: "background 0.15s",
                    }}
                  >
                    {isSalvando ? "..." : cfg.btnLabel}
                  </button>
                )}
              </div>

              {/* Linha secundária: botão Gerar Laudo (só para professional) */}
              {isProfessional && (() => {
                const info = testStatusMap[normName(l.paciente)];
                const testesOk = info ? info.testesOk : true;
                return (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${cfg.borda}` }}>
                    <button
                      onClick={() => testesOk && navigate("/laudos", { state: { painelData: { paciente: l.paciente, data: l.data } } })}
                      disabled={!testesOk}
                      title={!testesOk ? "Aguardando conclusão de todos os testes pelo estagiário" : ""}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", borderRadius: 7, border: "none",
                        background: testesOk ? "#2E7D32" : "#9ca3af",
                        color: "#fff", fontSize: 12, fontWeight: 700,
                        cursor: testesOk ? "pointer" : "not-allowed",
                      }}
                    >
                      📋 Gerar Laudo
                    </button>
                    {!testesOk && (
                      <div style={{ fontSize: 11, color: "#f97316", marginTop: 5 }}>
                        ⏳ Aguardando conclusão de todos os testes pelo estagiário
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })
      )}

      {/* ── PRÓXIMOS 7 DIAS ── */}
      {!loading && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setProximosAberto((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "none", border: "none", cursor: "pointer",
              color: "#6b7280", fontSize: 13, fontWeight: 500, padding: "4px 0",
            }}
          >
            <span style={{ transition: "transform 0.2s", display: "inline-block", transform: proximosAberto ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
            Próximos 7 dias
            {laudosProximos.length > 0 && (
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>({laudosProximos.length} laudos)</span>
            )}
          </button>

          {proximosAberto && (
            <div style={{ marginTop: 8 }}>
              {proximasDatas.length === 0 ? (
                <div style={{ color: "#9ca3af", fontSize: 13, padding: "8px 0" }}>Nenhum laudo Prevent Senior nos próximos 7 dias.</div>
              ) : (
                proximasDatas.map((data) => (
                  <div key={data} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                      {labelDia(data)}
                    </div>
                    {proximosGrupados[data].map((l) => (
                      <div
                        key={`${l.paciente}-${l.data}`}
                        style={{
                          background: "#f9fafb", border: "1px solid #f3f4f6",
                          borderRadius: 8, padding: "8px 12px", marginBottom: 4,
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          fontSize: 13, color: "#374151",
                        }}
                      >
                        <span>{l.paciente}</span>
                        <span style={{ color: "#9ca3af", fontSize: 11 }}>{l.hora}</span>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
