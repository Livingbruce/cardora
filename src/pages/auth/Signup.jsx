import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabase";
import cardoraLogo from "../../assets/cardoralogo.jpeg";
import {
  getOrCreateDeviceId,
  createNewTabSessionId,
  usernameToInternalEmail
} from "../../utils/sessionGuard";
import "../../styles/auth/signup.css";

const UPPER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER_CHARS = "abcdefghjkmnpqrstuvwxyz";
const DIGIT_CHARS = "23456789";
const ALL_CAPTCHA_CHARS = `${UPPER_CHARS}${LOWER_CHARS}${DIGIT_CHARS}`;

const getRandomUint32 = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
};

const pickFromPool = (pool) => pool[getRandomUint32() % pool.length];

const generateCaptchaCode = (length = 6) => {
  const safeLength = Math.max(4, length);
  const chars = [
    pickFromPool(UPPER_CHARS),
    pickFromPool(LOWER_CHARS),
    pickFromPool(DIGIT_CHARS)
  ];

  while (chars.length < safeLength) {
    chars.push(pickFromPool(ALL_CAPTCHA_CHARS));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = getRandomUint32() % (i + 1);
    const temp = chars[i];
    chars[i] = chars[j];
    chars[j] = temp;
  }

  return chars.join("");
};

const isExactCaptchaMatch = (input, expected) => {
  if (input.length !== expected.length) return false;
  for (let i = 0; i < expected.length; i += 1) {
    if (input[i] !== expected[i]) {
      return false;
    }
  }
  return true;
};

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repassword, setRepassword] = useState("");
  const [telegram, setTelegram] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaCode, setCaptchaCode] = useState(() => generateCaptchaCode(6));
  const [websiteTrap, setWebsiteTrap] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canvasRef = useRef(null);
  const formMountTimeRef = useRef(null);
  const navigate = useNavigate();

  const drawCaptchaCanvas = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() * 8 - 4), height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y + (Math.random() * 6 - 3));
      ctx.stroke();
    }

    for (let i = 0; i < 140; i += 1) {
      ctx.fillStyle = `rgba(148, 163, 184, ${(0.22 + Math.random() * 0.52).toFixed(2)})`;

      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        0.9 + Math.random() * 1.9,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    for (let i = 0; i < 7; i += 1) {
      ctx.strokeStyle =
        i % 2 === 0
          ? "rgba(250, 204, 21, 0.45)"
          : "rgba(56, 189, 248, 0.45)";

      ctx.lineWidth = 1.3 + Math.random() * 1.1;
      ctx.beginPath();

      ctx.moveTo(0, Math.random() * height);

      ctx.bezierCurveTo(
        width * 0.25,
        Math.random() * height,
        width * 0.75,
        Math.random() * height,
        width,
        Math.random() * height
      );

      ctx.stroke();
    }

    const step = width / (code.length + 1);

    for (let i = 0; i < code.length; i += 1) {
      const char = code[i];
      const x = step * (i + 1) + (Math.random() * 4 - 2);
      const y = height * 0.55 + (Math.random() * 12 - 6);
      const angle = Math.random() * 0.72 - 0.36;
      const skewX = Math.random() * 0.42 - 0.21;

      ctx.save();
      ctx.transform(1, 0, skewX, 1, x, y);
      ctx.rotate(angle);
      ctx.font = "800 22px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(2, 6, 23, 0.85)";
      ctx.strokeText(char, 0, 0);
      ctx.fillStyle = i % 2 === 0 ? "#f8fafc" : "#facc15";
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    const nextCode = generateCaptchaCode(6);

    setCaptchaCode(nextCode);
    setCaptchaInput("");
    formMountTimeRef.current = Date.now();
    drawCaptchaCanvas(nextCode);
  }, [drawCaptchaCanvas]);

  useEffect(() => {
    formMountTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    drawCaptchaCanvas(captchaCode);
  }, [captchaCode, drawCaptchaCanvas]);

  const handleSignup = async (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) return;

    setErrorMsg("");

    if (websiteTrap.trim() !== "") {
      setErrorMsg("Verification failed. Please try again.");
      refreshCaptcha();
      return;
    }

    const mountedAt = formMountTimeRef.current;
    const elapsedMs = mountedAt === null ? 0 : Date.now() - mountedAt;

    if (elapsedMs < 1200) {
      setErrorMsg("Please complete the captcha before submitting.");
      refreshCaptcha();
      return;
    }

    const submittedCaptcha = captchaInput.trim();
    if (!isExactCaptchaMatch(submittedCaptcha, captchaCode)) {
      setErrorMsg("Wrong captcha please try again!");
      refreshCaptcha();
      return;
    }

    if (password !== repassword) {
      setErrorMsg("Passwords do not match.");
      refreshCaptcha();
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("uid")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (existingProfile) {
        setErrorMsg("That username is already taken.");
        refreshCaptcha();
        return;
      }

      const email = usernameToInternalEmail(cleanUsername);
      const deviceId = getOrCreateDeviceId();
      const sessionId = createNewTabSessionId();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            telegram: telegram.trim() || null
          }
        }
      });

      if (authError) {
        setErrorMsg("Signup failed: " + authError.message);
        refreshCaptcha();
        return;
      }

      const uid = authData?.user?.id;
      if (!uid) {
        setErrorMsg(
          "Account created, but no user ID was returned. Check email confirmation settings in Supabase."
        );
        refreshCaptcha();
        return;
      }

      if (!authData?.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setErrorMsg("Account created, please sign in: " + signInError.message);
          navigate("/login", { replace: true });
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            uid,
            username: cleanUsername,
            telegram: telegram.trim() || null,
            trusted_device_id: deviceId,
            active_session_id: sessionId,
            balance: 0.0
          }
        ]);

      if (profileError) {
        setErrorMsg(
          "Account created, but saving profile failed: " + profileError.message
        );
        refreshCaptcha();
        return;
      }

      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Unexpected signup error:", err);
      setErrorMsg("An unexpected error occurred during registration.");
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSignInClick = () => {
    navigate("/login");
  };

  return (
    <div className="signup-page-container">
      <form onSubmit={handleSignup} className="signup-form">
        <img 
          src={cardoraLogo}
          alt="Cardora Logo" 
          className="signup-logo" 
        />
        <h2 className="signup-heading">CARDORA</h2>
        <p className="signup-notice">By registering you agree to our shop rules</p>

        {errorMsg && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fca5a5",
              borderRadius: "6px",
              padding: "10px 12px",
              marginBottom: "14px",
              fontSize: "0.88rem",
              fontWeight: 600
            }}
          >
            {errorMsg}
          </div>
        )}

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
            overflow: "hidden"
          }}
        >
          <label htmlFor="companyWebsite">Website</label>
          <input
            id="companyWebsite"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={websiteTrap}
            onChange={(e) => setWebsiteTrap(e.target.value)}
          />
        </div>

        <div className="signup-input-group">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <input
            type="password"
            value={repassword}
            onChange={(e) => setRepassword(e.target.value)}
            placeholder="Re-enter password"
            required
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <input
            type="text"
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="jabber or telegram"
            className="signup-input"
          />
        </div>

        <div className="signup-input-group">
          <div style={{ marginBottom: "8px" }}>
            <canvas
              ref={canvasRef}
              width={220}
              height={52}
              aria-label="Captcha image"
              style={{
                width: "100%",
                height: "52px",
                display: "block",
                borderRadius: "6px",
                border: "1px solid #334155"
              }}
            />
          </div>

          <input
            type="text"
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value)}
            placeholder="Captcha"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            required
            className="signup-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="signup-submit-btn"
        >
          {loading ? "Please wait..." : "Register"}
        </button>

        <div className="signup-signin-container">
          <button
            id="signin"
            type="button"
            onClick={handleSignInClick}
            className="signup-signin-btn"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}