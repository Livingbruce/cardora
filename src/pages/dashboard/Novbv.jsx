import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../utils/currentClient";
import "../../styles/dashboard/Novbv.css";

export default function Novbv() {
  const [binsList, setBinsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [base, setBase] = useState("All");
  const [category, setCategory] = useState("All");
  const [type, setType] = useState("All");
  const [level, setLevel] = useState("All");

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadFilteredBins = async () => {
      let query = supabase
        .from("bins_stock")
        .select("*", { count: "exact" });

      if (base !== "All") query = query.eq("base", base);
      if (category !== "All") query = query.eq("category", category);
      if (type !== "All") query = query.eq("type", type);
      if (level !== "All") query = query.eq("level", level);

      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      query = query
        .range(from, to)
        .order("id", { ascending: false });

      const { data, count, error } = await query;

      if (!isMounted) return;

      if (error) {
        console.error("Error fetching Novbv bins:", error.message);
      } else {
        setBinsList(data || []);
        setTotalCount(count || 0);
      }

      setLoading(false);
    };

    loadFilteredBins();

    return () => {
      isMounted = false;
    };
  }, [currentPage, rowsPerPage, base, category, type, level]);

  const fetchFilteredBins = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      let query = supabase
        .from("bins_stock")
        .select("*", { count: "exact" });

      if (base !== "All") query = query.eq("base", base);
      if (category !== "All") query = query.eq("category", category);
      if (type !== "All") query = query.eq("type", type);
      if (level !== "All") query = query.eq("level", level);

      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      query = query
        .range(from, to)
        .order("id", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching Novbv bins:", error.message);
      } else {
        setBinsList(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error("Unexpected error fetching Novbv bins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setBase("All");
    setCategory("All");
    setType("All");
    setLevel("All");
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;

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
            className={`novbv-page-btn ${currentPage === i ? "active" : ""}`}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      } else if (
        i === currentPage - 2 ||
        i === currentPage + 2
      ) {
        buttons.push(
          <span key={i} className="novbv-page-ellipsis">...</span>
        );
      }
    }
    return buttons;
  };

  const handleBuyItem = async (item) => {
    const client = await getActiveClient();
    if (client.error) {
      alert(client.error);
      return;
    }

    const price = Number(item.price || 0);
    const charge = await chargeClientBalance(client.uid, client.balance, price);
    if (charge.error) {
      alert(charge.error);
      return;
    }

    const payload = {
      client_uid: client.uid,
      username: client.username,
      client_handle: client.clientHandle,
      category: "Novbv",
      stock_id: item.id,
      item_summary: `${item.category} - ${item.base} (${item.country})`,
      full_details: [
        `Client: ${client.clientHandle} (UID: ${client.uid})`,
        `Bin Stock ID: #BIN-${item.id}`,
        `Base: ${item.base}`,
        `Category: ${item.category}`,
        `Country: ${item.country}`,
        `Type: ${item.type || "N/A"}`,
        `Level: ${item.level || "N/A"}`,
        `Price: $${price.toFixed(2)}`
      ].join("\n"),
      price,
      status: "pending"
    };

    const { error } = await supabase.from("shop_orders").insert([payload]);

    if (error) {
      alert("Error creating order: " + error.message);
      return;
    }

    alert(
      `Order placed for Bin #BIN-${item.id} ($${price.toFixed(2)}) under ${client.clientHandle}. Remaining balance: $${charge.nextBalance.toFixed(2)}`
    );
  };

  return (
    <div className="novbv-container">
      <div className="novbv-header">
        <h2>Buy Bin</h2>
      </div>

      <div className="novbv-filter-card">
        <form onSubmit={fetchFilteredBins} className="novbv-inputs-row">
          <div className="novbv-row">
            <label htmlFor="base">Base</label>
            <select id="base" value={base} onChange={(e) => setBase(e.target.value)}>
              <option value="All">All</option>
              <option value="EUROPE">EUROPE</option>
              <option value="AUTO VBV USA">ASIAN</option>
              <option value="USA">USA</option>
              <option value="NOVBV WORLD MIX">NOVBV WORLD MIX</option>
              <option value="CANADA">CANADA</option>
              <option value="APPLE PAY">APPLE PAY</option>
              <option value="ASIAVEU NOVBV">ASIAVEU NOVBV</option>
              <option value="STRIPE">STRIPE</option>
              <option value="ASIAEU NOVBV">ASIAEU NOVBV</option>
            </select>
          </div>

          <div className="novbv-row">
            <label htmlFor="category">Category</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">All</option>
              <option value="NOVBV">NOVBV</option>
              <option value="AUTOVBV">AUTOVBV</option>
            </select>
          </div>

          <div className="novbv-row">
            <label htmlFor="type">Type</label>
            <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>

          <div className="novbv-row">
            <label htmlFor="level">Level</label>
            <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="All">All</option>
              <option value="gold">GOLD</option>
              <option value="infinite">INFINITE</option>
              <option value="mixed bin">MIXED BIN</option>
              <option value="mixed product">MIXED PRODUCT</option>
              <option value="personal gold charge">PERSONAL GOLD CHARGE</option>
              <option value="personal green revolve">PERSONAL GREEN REVOLVE</option>
              <option value="personal platinum revolve">PERSONAL PLATINUM REVOLVE</option>
              <option value="platinum">PLATINUM</option>
              <option value="platinum world">PLATINUM/WORLD</option>
              <option value="prepaid">PREPAID</option>
              <option value="prepaid business">PREPAID BUSINESS</option>
              <option value="prepaid corporate_te">PREPAID CORPORATE T&amp;E</option>
              <option value="prepaid electron">PREPAID ELECTRON</option>
              <option value="prepaid platinum">PREPAID PLATINUM</option>
              <option value="prepaid platinum_travel">PREPAID PLATINUM TRAVEL</option>
              <option value="prepaid purchasing">PREPAID PURCHASING</option>
              <option value="purchasing">PURCHASING</option>
              <option value="purchasing with fleet">PURCHASING WITH FLEET</option>
              <option value="signature">SIGNATURE</option>
              <option value="standard">STANDARD</option>
              <option value="titanium">TITANIUM</option>
              <option value="world">WORLD</option>
              <option value="world business">WORLD BUSINESS</option>
              <option value="world elite">WORLD ELITE</option>
              <option value="world elite for business">WORLD ELITE FOR BUSINESS</option>
              <option value="world for business">WORLD FOR BUSINESS</option>
            </select>
          </div>

          <div className="novbv-buttons-container">
            <button type="submit" id="apply" className="novbv-btn-apply">Apply Filter</button>
            <button type="button" id="clear" className="novbv-btn-clear" onClick={handleClear}>Clear Filter</button>
          </div>
        </form>
      </div>

      <div className="novbv-table-section">
        <div className="novbv-table-wrapper">
          <table className="novbv-table">
            <thead>
              <tr>
                <th>Bin ID</th>
                <th>Base</th>
                <th>Category</th>
                <th>Country</th>
                <th>Type</th>
                <th>Level</th>
                <th>Price</th>
                <th>Buy Now</th>
              </tr>
            </thead>
            <tbody id="binBody">
              {loading ? (
                <tr>
                  <td colSpan="8" className="novbv-empty-row">Loading available bins...</td>
                </tr>
              ) : binsList.length > 0 ? (
                binsList.map(item => (
                  <tr key={item.id}>
                    <td><code>#BIN-{item.id}</code></td>
                    <td>{item.base}</td>
                    <td>
                      <span style={{ fontWeight: 600, color: item.category === "NOVBV" ? "#2563eb" : "#9333ea" }}>
                        {item.category}
                      </span>
                    </td>
                    <td>{item.country}</td>
                    <td style={{ textTransform: "capitalize" }}>{item.type}</td>
                    <td style={{ textTransform: "capitalize" }}>{item.level}</td>
                    <td><strong>${Number(item.price).toFixed(2)}</strong></td>
                    <td>
                      <button 
                        onClick={() => handleBuyItem(item)}
                        style={{
                          backgroundColor: "#10b981",
                          color: "#fff",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="novbv-empty-row">No Bins found matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="novbv-table-footer">
          <div className="novbv-rows-selector">
            <label htmlFor="rowsLimit">Rows on page:</label>
            <select 
              id="rowsLimit" 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={20}>20 Rows</option>
              <option value={50}>50 Rows</option>
              <option value={100}>100 Rows</option>
            </select>
          </div>

          <div className="novbv-pagination">
            {renderPaginationButtons()}
          </div>
        </div>
      </div>
    </div>
  );
}