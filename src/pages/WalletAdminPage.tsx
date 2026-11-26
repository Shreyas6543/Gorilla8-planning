import { useState } from "react";
import { Box, Button, Container, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { PageHeader } from "../components/PageHeader";
import { useAdmin } from "../state/adminAuth";
import {
  getWalletByPhone,
  redeemCredit,
  addCredit,
  loadWalletTransactions,
  type Wallet,
  type WalletTransaction,
} from "../lib/qrFunnel";

// Counter-side wallet tool: look up a customer by phone, see their balance
// and history, redeem credit against a visit OR top it up for a promotion
// ("we'll be doing more and more promotions... cash might get added more
// and more," per Shreyas — credit_balance is a running total, not a
// one-shot thing). Admin-only (not just isViewer) — this is a real write
// against money-like data, unlike the rest of QrScansPage.tsx which is
// read-only for a viewer. Shreyas manages these personally for now (his
// call) — if staff need this later without the full edit passcode, a third
// access tier would be the place to revisit, not loosening this one.
export function WalletAdminPage() {
  const { isAdmin } = useAdmin();
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState<Wallet | null | "not_found">(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addReason, setAddReason] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLookup() {
    setStatus(null);
    setBusy(true);
    const found = await getWalletByPhone(phone);
    setWallet(found ?? "not_found");
    setRedeemAmount(found ? String(found.creditBalance) : "");
    setAddAmount("");
    setAddReason("");
    setTransactions(found ? await loadWalletTransactions(found.phone) : []);
    setBusy(false);
  }

  async function refreshTransactions(forPhone: string) {
    setTransactions(await loadWalletTransactions(forPhone));
  }

  async function handleRedeem() {
    if (!wallet || wallet === "not_found") return;
    const amt = Number(redeemAmount);
    if (!(amt > 0)) {
      setStatus("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    const result = await redeemCredit(wallet.phone, amt);
    setBusy(false);
    if (result.ok) {
      setStatus(`Redeemed ₹${amt}. New balance: ₹${result.newBalance}.`);
      setWallet({ ...wallet, creditBalance: result.newBalance });
      setRedeemAmount(String(result.newBalance));
      void refreshTransactions(wallet.phone);
    } else if (result.reason === "insufficient") {
      setStatus("That's more than their remaining balance.");
    } else if (result.reason === "not_found") {
      setStatus("Wallet not found — it may have changed since you looked it up.");
    } else {
      setStatus("Something went wrong — try again.");
    }
  }

  async function handleAddCredit() {
    if (!wallet || wallet === "not_found") return;
    const amt = Number(addAmount);
    if (!(amt > 0)) {
      setStatus("Enter an amount greater than 0 to add.");
      return;
    }
    if (!addReason.trim()) {
      setStatus("Say what this credit is for (e.g. a promo name) — shows up in their history.");
      return;
    }
    setBusy(true);
    const result = await addCredit(wallet.phone, amt, addReason);
    setBusy(false);
    if (result.ok) {
      setStatus(`Added ₹${amt}. New balance: ₹${result.newBalance}.`);
      setWallet({ ...wallet, creditBalance: result.newBalance });
      setRedeemAmount(String(result.newBalance));
      setAddAmount("");
      setAddReason("");
      void refreshTransactions(wallet.phone);
    } else if (result.reason === "not_found") {
      setStatus("Wallet not found — it may have changed since you looked it up.");
    } else {
      setStatus("Something went wrong — try again.");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <Container maxWidth="sm" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Look up a customer's wallet by phone — redeem credit at the counter, or add credit for a promotion." />

        {!isAdmin ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Managing wallets requires admin mode (tap the logo 5 times, or unlock at /team with the admin
              passcode) — viewer access alone isn't enough, since this writes against real money.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2.5}>
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
                Look up by phone
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
                <Button variant="contained" onClick={handleLookup} disabled={busy} sx={{ color: "#04140a" }}>
                  Look up
                </Button>
              </Stack>
            </Paper>

            {wallet === "not_found" && (
              <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid rgba(255,107,107,0.3)" }}>
                <Typography variant="body2" sx={{ color: "#FF6B6B" }}>
                  No wallet found for that number.
                </Typography>
              </Paper>
            )}

            {wallet && wallet !== "not_found" && (
              <>
                <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    ₹{wallet.creditBalance} balance
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    {wallet.phone} · claimed {new Date(wallet.createdAt).toLocaleDateString("en-IN")}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Redeem (at the counter)
                  </Typography>
                  <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
                    <TextField
                      size="small"
                      type="number"
                      label="Amount"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                    />
                    <Button variant="contained" onClick={handleRedeem} disabled={busy} sx={{ color: "#04140a" }}>
                      Redeem
                    </Button>
                  </Stack>

                  <Divider sx={{ mb: 2.5 }} />

                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Add credit (e.g. a promotion)
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField
                      size="small"
                      type="number"
                      label="Amount"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      sx={{ maxWidth: { sm: 120 } }}
                    />
                    <TextField
                      size="small"
                      label="Reason (e.g. Diwali promo)"
                      value={addReason}
                      onChange={(e) => setAddReason(e.target.value)}
                      fullWidth
                    />
                    <Button variant="outlined" onClick={handleAddCredit} disabled={busy} sx={{ borderColor: "rgba(255,255,255,0.2)" }}>
                      Add
                    </Button>
                  </Stack>
                </Paper>

                {transactions.length > 0 && (
                  <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      History
                    </Typography>
                    <Stack spacing={1}>
                      {transactions.map((t, i) => (
                        <Stack key={i} direction="row" sx={{ justifyContent: "space-between" }}>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            {t.reason} · {new Date(t.createdAt).toLocaleDateString("en-IN")}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: t.amount > 0 ? "#39FF88" : "#FF6B6B" }}>
                            {t.amount > 0 ? "+" : ""}₹{t.amount}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </>
            )}

            {status && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {status}
              </Typography>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
