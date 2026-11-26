import { useState } from "react";
import { Box, Button, Container, Paper, Stack, TextField, Typography } from "@mui/material";
import { PageHeader } from "../components/PageHeader";
import { useAdmin } from "../state/adminAuth";
import { getWalletByPhone, redeemCredit, type Wallet } from "../lib/qrFunnel";

// Counter-side tool: look up a wallet by phone, redeem some/all of its
// credit. Admin-only (not just isViewer) — this is a real write against
// money-like data, unlike the rest of QrScansPage.tsx which is read-only
// for a viewer. Shreyas redeems these personally at the counter for now
// (his call) — if staff need this later without the full edit passcode, a
// third access tier would be the place to revisit, not loosening this one.
export function RedeemPage() {
  const { isAdmin } = useAdmin();
  const [phone, setPhone] = useState("");
  const [wallet, setWallet] = useState<Wallet | null | "not_found">(null);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLookup() {
    setStatus(null);
    setBusy(true);
    const found = await getWalletByPhone(phone);
    setWallet(found ?? "not_found");
    setAmount(found ? String(found.creditBalance) : "");
    setBusy(false);
  }

  async function handleRedeem() {
    if (!wallet || wallet === "not_found") return;
    const amt = Number(amount);
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
      setAmount(String(result.newBalance));
    } else if (result.reason === "insufficient") {
      setStatus("That's more than their remaining balance.");
    } else if (result.reason === "not_found") {
      setStatus("Wallet not found — it may have changed since you looked it up.");
    } else {
      setStatus("Something went wrong — try again.");
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 8 }}>
      <Container maxWidth="sm" sx={{ pt: { xs: 4, md: 6 } }}>
        <PageHeader subtitle="Look up a customer's wallet by phone number and redeem credit at the counter." />

        {!isAdmin ? (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Redeeming credit requires admin mode (tap the logo 5 times, or unlock at /team with the admin
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
              <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  ₹{wallet.creditBalance} available
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                  {wallet.phone} · claimed {new Date(wallet.createdAt).toLocaleDateString("en-IN")}
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    size="small"
                    type="number"
                    label="Amount to redeem"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Button variant="contained" onClick={handleRedeem} disabled={busy} sx={{ color: "#04140a" }}>
                    Redeem
                  </Button>
                </Stack>
              </Paper>
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
