import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../../../utils/supabase";
import { banks, level, brand } from "../../../components/countrys";
import "../../../styles/dashboard/sources/source1.css";

const FlagIndicator = ({ value, label }) => (
  <span
    className={`source1-flag ${value ? "is-yes" : "is-no"}`}
    title={`${label}: ${value ? "Yes" : "No"}`}
    aria-label={`${label}: ${value ? "Yes" : "No"}`}
  >
    {value ? "✓" : "✗"}
  </span>
);

export default function Source1() {
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [bank, setBank] = useState("");
  const [card, setCard] = useState("");
  const [cardType, setCardType] = useState("");
  const [cardLevel, setCardLevel] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [withZip, setWithZip] = useState(false);
  const [phone, setPhone] = useState(false);
  const [email, setEmail] = useState(false);
  const [dob, setDob] = useState(false);
  const [box, setBox] = useState(false);
  const [binList, setBinList] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    state: "",
    city: "",
    zip: "",
    bank: "",
    card: "",
    cardType: "",
    cardLevel: "",
    priceFrom: "",
    priceTo: "",
    withZip: false,
    phone: false,
    email: false,
    dob: false,
    box: false,
    binList: ""
  });

  const [cvvRows, setCvvRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  const [selectedIds, setSelectedIds] = useState([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderNotice, setOrderNotice] = useState("");

  const [bankSearch, setBankSearch] = useState("");
  const [levelSearch, setLevelSearch] = useState("");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);

  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const bankDropdownRef = useRef(null);
  const levelDropdownRef = useRef(null);
  const bankSearchInputRef = useRef(null);
  const levelSearchInputRef = useRef(null);
  const selectAllRef = useRef(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  const sortedBanks = useMemo(() => {
    if (!Array.isArray(banks)) return [];
    return [...banks].sort((a, b) => a.localeCompare(b));
  }, []);

  const sortedLevel = useMemo(() => {
    if (!Array.isArray(level)) return [];
    return [...level].sort((a, b) => a.localeCompare(b));
  }, []);

  const sortedBrand = [...brand].sort((a, b) => a.localeCompare(b));

  const filteredBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    const matches = query
      ? sortedBanks.filter((item) => item.toLowerCase().includes(query))
      : sortedBanks;

    if (bank && !matches.includes(bank)) {
      return [bank, ...matches];
    }
    return matches;
  }, [sortedBanks, bankSearch, bank]);

  const filteredLevel = useMemo(() => {
    const query = levelSearch.trim().toLowerCase();
    const matches = query
      ? sortedLevel.filter((item) => item.toLowerCase().includes(query))
      : sortedLevel;

    if (cardLevel && !matches.includes(cardLevel)) {
      return [cardLevel, ...matches];
    }
    return matches;
  }, [sortedLevel, levelSearch, cardLevel]);

  useEffect(() => {
    let active = true;

    const loadCvvStock = async () => {
      try {
        let query = supabase
          .from("cvv_stock")
          .select("*", { count: "exact" })
          .eq("status", "available");

        if (appliedFilters.state.trim()) {
          query = query.ilike("state", `%${appliedFilters.state.trim()}%`);
        }

        if (appliedFilters.city.trim()) {
          query = query.ilike("city", `%${appliedFilters.city.trim()}%`);
        }

        if (appliedFilters.zip.trim()) {
          query = query.ilike("zip", `%${appliedFilters.zip.trim()}%`);
        }

        if (appliedFilters.bank.trim()) {
          query = query.eq("bank", appliedFilters.bank.trim());
        }

        if (appliedFilters.cardType.trim()) {
          query = query.eq("card_type", appliedFilters.cardType.trim());
        }

        if (appliedFilters.cardLevel.trim()) {
          query = query.ilike("card_level", appliedFilters.cardLevel.trim());
        }

        const minPrice = parseFloat(appliedFilters.priceFrom);
        if (!Number.isNaN(minPrice)) {
          query = query.gte("price", minPrice);
        }

        const maxPrice = parseFloat(appliedFilters.priceTo);
        if (!Number.isNaN(maxPrice)) {
          query = query.lte("price", maxPrice);
        }

        if (appliedFilters.binList.trim()) {
          const bins = appliedFilters.binList
            .split(/[\s,]+/)
            .map((b) => b.trim())
            .filter(Boolean);

          if (bins.length === 1) {
            query = query.ilike("bin", `${bins[0]}%`);
          } else if (bins.length > 1) {
            query = query.in("bin", bins);
          }
        }

        if (appliedFilters.withZip) {
          query = query.not("zip", "is", null).neq("zip", "");
        }

        if (appliedFilters.phone) {
          query = query.eq("phone", true);
        }

        if (appliedFilters.email) {
          query = query.eq("email", true);
        }

        if (appliedFilters.box) {
          query = query.not("address", "eq", false);
        }

        const from = (currentPage - 1) * rowsPerPage;
        const to = from + rowsPerPage - 1;

        const { data, error, count } = await query
          .order("id", { ascending: false })
          .range(from, to);

        if (error) {
          throw error;
        }

        if (!active) return;
        setCvvRows(data || []);
        setTotalCount(typeof count === "number" ? count : (data || []).length);
        setErrorMsg("");
      } catch (err) {
        if (!active) return;
        console.error("Error fetching cvv_stock:", err);
        setErrorMsg(err.message || "Failed to load CVV inventory.");
        setCvvRows([]);
        setTotalCount(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCvvStock();

    return () => {
      active = false;
    };
  }, [appliedFilters, currentPage, rowsPerPage, refreshTick]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    if (cvvRows.length === 0) {
      selectAllRef.current.indeterminate = false;
      selectAllRef.current.checked = false;
      return;
    }
    const allVisibleSelected = cvvRows.every((row) =>
      selectedIds.includes(row.id)
    );
    const someVisibleSelected = cvvRows.some((row) =>
      selectedIds.includes(row.id)
    );
    selectAllRef.current.checked = allVisibleSelected;
    selectAllRef.current.indeterminate =
      someVisibleSelected && !allVisibleSelected;
  }, [cvvRows, selectedIds]);

  useEffect(() => {
    if (!bankDropdownOpen) return;

    const handleOutsideClick = (e) => {
      if (
        bankDropdownRef.current &&
        !bankDropdownRef.current.contains(e.target)
      ) {
        setBankDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setBankDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = setTimeout(() => {
      bankSearchInputRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [bankDropdownOpen]);

  useEffect(() => {
    if (!levelDropdownOpen) return;

    const handleOutsideClick = (e) => {
      if (
        levelDropdownRef.current &&
        !levelDropdownRef.current.contains(e.target)
      ) {
        setLevelDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setLevelDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    const focusTimer = setTimeout(() => {
      levelSearchInputRef.current?.focus();
    }, 0);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [levelDropdownOpen]);

  const handleToggleRow = (id) => {
    setOrderNotice("");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (e) => {
    setOrderNotice("");
    if (e.target.checked) {
      const visibleIds = cvvRows.map((row) => row.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      const visibleSet = new Set(cvvRows.map((row) => row.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    }
  };

  const handlePlaceOrder = async () => {
    if (placingOrder) return;
    if (selectedIds.length === 0) {
      setOrderNotice("Select at least one CVV row to place an order.");
      return;
    }

    setPlacingOrder(true);
    setOrderNotice("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      const clientHandle =
        user?.user_metadata?.username || user?.email || "@guest_user";

      const { data, error } = await supabase.rpc("add_cvv_to_cart_and_order", {
        p_stock_ids: selectedIds,
        p_client_handle: clientHandle
      });

      if (error) {
        setOrderNotice(error.message || "Failed to place order.");
        return;
      }

      if (!data?.ok) {
        setOrderNotice(data?.error || "Could not process order.");
        return;
      }

      const createdOrders = Array.isArray(data.orders) ? data.orders : [];

      try {
        window.dispatchEvent(
          new CustomEvent("cardora:cart-updated", {
            detail: {
              newBalance: data.new_balance,
              deducted: data.deducted,
              orders: createdOrders
            }
          })
        );
      } catch {
        // Ignore event errors
      }

      setRefreshTick((prev) => prev + 1);
      setOrderNotice(
        `Order placed for ${selectedIds.length} item(s). Deducted $${Number(
          data.deducted || 0
        ).toFixed(2)}.`
      );
    } catch (err) {
      console.error("Place order error:", err);
      setOrderNotice(err.message || "Unexpected error placing order.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleApplyFilters = () => {
    setLoading(true);
    setErrorMsg("");
    setCurrentPage(1);
    setAppliedFilters({
      state,
      city,
      zip,
      bank,
      card,
      cardType,
      cardLevel,
      priceFrom,
      priceTo,
      withZip,
      phone,
      email,
      dob,
      box,
      binList
    });
  };

  const handleClear = () => {
    const empty = {
      state: "",
      city: "",
      zip: "",
      bank: "",
      card: "",
      cardType: "",
      cardLevel: "",
      priceFrom: "",
      priceTo: "",
      withZip: false,
      phone: false,
      email: false,
      dob: false,
      box: false,
      binList: ""
    };

    setState("");
    setCity("");
    setZip("");
    setBank("");
    setBankSearch("");
    setBankDropdownOpen(false);
    setCard("");
    setCardType("");
    setCardLevel("");
    setLevelSearch("");
    setLevelDropdownOpen(false);
    setPriceFrom("");
    setPriceTo("");
    setWithZip(false);
    setPhone(false);
    setEmail(false);
    setDob(false);
    setBox(false);
    setBinList("");
    setLoading(true);
    setErrorMsg("");
    setCurrentPage(1);
    setAppliedFilters(empty);
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`source1-page-btn ${currentPage === i ? "active" : ""}`}
            onClick={() => {
              setLoading(true);
              setCurrentPage(i);
            }}
          >
            {i}
          </button>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        buttons.push(
          <span key={i} className="source1-page-ellipsis">
            ...
          </span>
        );
      }
    }
    return buttons;
  };

  return (
    <div className="source1-container">
      <h2 className="source1-header">Find and buy Cvv</h2>
      <p className="source1-subtitle">Filter Options</p>

      <div className="source1-filter-card">
        <div className="source1-grid">
          <div className="source1-box">
            <label htmlFor="state">State</label>
            <input
              id="state"
              type="text"
              placeholder="Enter state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </div>

          <div className="source1-box">
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              placeholder="Enter city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="source1-box">
            <label htmlFor="zip">Zip</label>
            <input
              id="zip"
              type="text"
              placeholder="Enter zip"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>

          <div className="source1-box" ref={bankDropdownRef}>
            <label htmlFor="bank-trigger">
              Bank Name {/* ({filteredBanks.length}) */}
            </label>
            <div className="cvv-select-wrapper">
              <button
                id="bank-trigger"
                type="button"
                className={`cvv-select-trigger ${bankDropdownOpen ? "open" : ""}`}
                onClick={() => {
                  setLevelDropdownOpen(false);
                  setBankDropdownOpen((prev) => !prev);
                }}
                aria-expanded={bankDropdownOpen}
              >
                <span className={bank ? "" : "cvv-select-placeholder"}>
                  {bank || "Select a bank"}
                </span>
                <span className="cvv-select-arrow">
                  {bankDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {bankDropdownOpen && (
                <div className="cvv-select-menu">
                  <div className="cvv-select-search-box">
                    <input
                      ref={bankSearchInputRef}
                      type="text"
                      className="cvv-select-search-input"
                      placeholder="Type to search bank..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="cvv-select-options">
                    {bank && (
                      <button
                        type="button"
                        className="cvv-select-option cvv-select-clear"
                        onClick={() => {
                          setBank("");
                          setBankSearch("");
                          setBankDropdownOpen(false);
                        }}
                      >
                        — Clear selection —
                      </button>
                    )}

                    {filteredBanks.length > 0 ? (
                      filteredBanks.map((item, index) => {
                        const isSelected = item === bank;
                        return (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            className={`cvv-select-option ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={() => {
                              setBank(item);
                              setBankSearch("");
                              setBankDropdownOpen(false);
                            }}
                          >
                            {item}
                          </button>
                        );
                      })
                    ) : (
                      <div className="cvv-select-no-results">
                        No matching banks found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="source1-box">
            <label htmlFor="card">Card Brand</label>
            <select id="card" value={card} onChange={(e) => setCard(e.target.value)}>
              {sortedBrand.map((item, index) => (
                <option key={index} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="source1-box">
            <label htmlFor="cardType">Card Type</label>
            <select
              id="cardType"
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
            >
              <option value="">Select Type</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
              <option value="charge card">Charge Card</option>
            </select>
          </div>

          <div className="source1-box" ref={levelDropdownRef}>
            <label htmlFor="level-trigger">
              Card Level {/*({filteredLevel.length})*/}
            </label>
            <div className="cvv-select-wrapper">
              <button
                id="level-trigger"
                type="button"
                className={`cvv-select-trigger ${levelDropdownOpen ? "open" : ""}`}
                onClick={() => {
                  setBankDropdownOpen(false);
                  setLevelDropdownOpen((prev) => !prev);
                }}
                aria-expanded={levelDropdownOpen}
              >
                <span className={cardLevel ? "" : "cvv-select-placeholder"}>
                  {cardLevel || "Select level"}
                </span>
                <span className="cvv-select-arrow">
                  {levelDropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {levelDropdownOpen && (
                <div className="cvv-select-menu">
                  <div className="cvv-select-search-box">
                    <input
                      ref={levelSearchInputRef}
                      type="text"
                      className="cvv-select-search-input"
                      placeholder="Search Level..."
                      value={levelSearch}
                      onChange={(e) => setLevelSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="cvv-select-options">
                    {cardLevel && (
                      <button
                        type="button"
                        className="cvv-select-option cvv-select-clear"
                        onClick={() => {
                          setCardLevel("");
                          setLevelSearch("");
                          setLevelDropdownOpen(false);
                        }}
                      >
                        — Clear selection —
                      </button>
                    )}

                    {filteredLevel.length > 0 ? (
                      filteredLevel.map((item, index) => {
                        const isSelected = item === cardLevel;
                        return (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            className={`cvv-select-option ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={() => {
                              setCardLevel(item);
                              setLevelSearch("");
                              setLevelDropdownOpen(false);
                            }}
                          >
                            {item}
                          </button>
                        );
                      })
                    ) : (
                      <div className="cvv-select-no-results">
                        No matching level found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="source1-box">
            <label htmlFor="priceFrom">Price From</label>
            <input
              id="priceFrom"
              type="text"
              placeholder="0.00"
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
            />
          </div>

          <div className="source1-box">
            <label htmlFor="priceTo">Price To</label>
            <input
              id="priceTo"
              type="text"
              placeholder="0.00"
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
            />
          </div>

          <div className="source1-box">
            <label htmlFor="binList">Bin List</label>
            <input
              id="binList"
              type="text"
              placeholder="e.g. 453200"
              value={binList}
              onChange={(e) => setBinList(e.target.value)}
            />
          </div>

          <div className="source1-box checkbox-box">
            <input
              id="withZip"
              type="checkbox"
              checked={withZip}
              onChange={(e) => setWithZip(e.target.checked)}
            />
            <label htmlFor="withZip">With Zip</label>
          </div>

          <div className="source1-box checkbox-box">
            <input
              id="phone"
              type="checkbox"
              checked={phone}
              onChange={(e) => setPhone(e.target.checked)}
            />
            <label htmlFor="phone">With Phone</label>
          </div>

          <div className="source1-box checkbox-box">
            <input
              id="email"
              type="checkbox"
              checked={email}
              onChange={(e) => setEmail(e.target.checked)}
            />
            <label htmlFor="email">With Email</label>
          </div>

          <div className="source1-box checkbox-box">
            <input
              id="dob"
              type="checkbox"
              checked={dob}
              onChange={(e) => setDob(e.target.checked)}
            />
            <label htmlFor="dob">With DOB</label>
          </div>

          <div className="source1-box checkbox-box">
            <input
              id="box"
              type="checkbox"
              checked={box}
              onChange={(e) => setBox(e.target.checked)}
            />
            <label htmlFor="box">Not P.O. Box</label>
          </div>
        </div>

        <div className="source1-buttons">
          <button
            type="button"
            id="apply"
            className="source1-btn-apply"
            onClick={handleApplyFilters}
          >
            Apply Filters
          </button>
          <button
            type="button"
            id="clear"
            className="source1-btn-clear"
            onClick={handleClear}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="source1-table-section">
        <div className="source1-table-toolbar">
          <div className="source1-toolbar-left">
            <button
              type="button"
              className="source1-btn-cart"
              onClick={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? "Placing Order..." : "Place Order"}
            </button>
          </div>

          {orderNotice && (
            <span className="source1-cart-notice">{orderNotice}</span>
          )}
        </div>

        <div className="source1-table-wrapper">
          <table className="source1-table">
            <thead>
              <tr>
                <th className="source1-col-check">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all CVV rows on page"
                    onChange={handleToggleSelectAll}
                  />
                </th>
                <th>Bin</th>
                <th>Bank</th>
                <th>Type</th>
                <th>Level</th>
                <th>Exp</th>
                <th>Country</th>
                <th>State</th>
                <th>City</th>
                <th>Zip</th>
                <th>FName</th>
                <th>Addr</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Fullz</th>
                <th>Ref</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody id="body">
              {loading ? (
                <tr>
                  <td colSpan="17" className="source1-empty-row">
                    Loading CVV stock...
                  </td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="17" className="source1-empty-row">
                    {errorMsg}
                  </td>
                </tr>
              ) : cvvRows.length > 0 ? (
                cvvRows.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "is-selected" : ""}
                    >
                      <td className="source1-col-check">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select CVV ${item.bin}`}
                        />
                      </td>
                      <td>
                        <code>{item.bin}</code>
                      </td>
                      <td>{item.bank}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {item.card_type || "N/A"}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {item.card_level || "N/A"}
                      </td>
                      <td>{item.expiry || "N/A"}</td>
                      <td>{item.country || "N/A"}</td>
                      <td>{item.state || "N/A"}</td>
                      <td>{item.city || "N/A"}</td>
                      <td>{item.zip || "N/A"}</td>
                      <td>{item.fname || "N/A"}</td>
                      <td>
                        <FlagIndicator value={item.address} label="Address" />
                      </td>
                      <td>
                        <FlagIndicator value={item.phone} label="Phone" />
                      </td>
                      <td>
                        <FlagIndicator value={item.email} label="Email" />
                      </td>
                      <td>
                        <FlagIndicator value={item.fullz} label="Fullz" />
                      </td>
                      <td>
                        <FlagIndicator value={item.reference} label="Reference" />
                      </td>
                      <td>
                        <strong>${Number(item.price || 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="17" className="source1-empty-row">
                    No Data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="source1-table-footer">
          <div className="source1-rows-selector">
            <label htmlFor="rowsLimit">Rows on page:</label>
            <select
              id="rowsLimit"
              value={rowsPerPage}
              onChange={(e) => {
                setLoading(true);
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={20}>20 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
          </div>

          <div className="source1-pagination">{renderPaginationButtons()}</div>
        </div>
      </div>
    </div>
  );
}