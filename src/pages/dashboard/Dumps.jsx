import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase";
import { getActiveClient, chargeClientBalance } from "../../utils/currentClient";
import "../../styles/dashboard/Dumps.css";

export default function Dumps() {
  const [dumpsList, setDumpsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const [base, setBase] = useState("");
  const [bin, setBin] = useState("");
  const [country, setCountry] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [classOp, setClassOp] = useState("");
  const [code, setCode] = useState("");
  const [zip, setZip] = useState("");
  const [track1, setTrack1] = useState(false);
  const [withPin, setWithPin] = useState(false);

  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFilteredDumps = async () => {
    setLoading(true);

    try {
      let query = supabase
        .from("dumps_stock")
        .select("*", { count: "exact" });

      if (base) query = query.eq("base", base);
      if (bin) query = query.ilike("bin", `%${bin}%`);
      if (country) query = query.eq("country", country);
      if (type) query = query.ilike("type", `%${type}%`);
      if (level) query = query.ilike("level", `%${level}%`);
      if (classOp) query = query.ilike("class_type", `%${classOp}%`);
      if (code) query = query.eq("code", code);
      if (zip) query = query.ilike("zip", `%${zip}%`);

      if (track1) query = query.eq("track1", true);
      if (withPin) query = query.eq("pin", true);

      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      query = query
        .range(from, to)
        .order("id", { ascending: false });

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching shop dumps:", error.message);
      } else {
        setDumpsList(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error("Unexpected error fetching dumps:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadFilteredDumps = async () => {
      let query = supabase
        .from("dumps_stock")
        .select("*", { count: "exact" });

      if (base) query = query.eq("base", base);
      if (bin) query = query.ilike("bin", `%${bin}%`);
      if (country) query = query.eq("country", country);
      if (type) query = query.ilike("type", `%${type}%`);
      if (level) query = query.ilike("level", `%${level}%`);
      if (classOp) query = query.ilike("class_type", `%${classOp}%`);
      if (code) query = query.eq("code", code);
      if (zip) query = query.ilike("zip", `%${zip}%`);

      if (track1) query = query.eq("track1", true);
      if (withPin) query = query.eq("pin", true);

      const from = (currentPage - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      query = query
        .range(from, to)
        .order("id", { ascending: false });

      try {
        const { data, count, error } = await query;

        if (!isMounted) return;

        if (error) {
          console.error("Error fetching shop dumps:", error.message);
        } else {
          setDumpsList(data || []);
          setTotalCount(count || 0);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Unexpected error fetching dumps:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadFilteredDumps();

    return () => {
      isMounted = false;
    };
  }, [
    base,
    bin,
    country,
    type,
    level,
    classOp,
    code,
    zip,
    track1,
    withPin,
    currentPage,
    rowsPerPage
  ]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchFilteredDumps();
  };

  const handleClear = () => {
    setLoading(true);
    setBase("");
    setBin("");
    setCountry("");
    setType("");
    setLevel("");
    setClassOp("");
    setCode("");
    setZip("");
    setTrack1(false);
    setWithPin(false);
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
            onClick={() => {
              setLoading(true);
              setCurrentPage(i);
            }}
          >
            {i}
          </button>
        );
      } else if (
        i === currentPage - 2 ||
        i === currentPage + 2
      ) {
        buttons.push(
          <span key={i} className="novbv-page-ellipsis">
            ...
          </span>
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
      category: "Dumps",
      stock_id: item.id,
      item_summary: `Dump ${item.bin} - ${item.country} (${item.type || "N/A"})`,
      full_details: [
        `Client: ${client.clientHandle} (UID: ${client.uid})`,
        `Dump Stock ID: #DMP-${item.id}`,
        `Base: ${item.base}`,
        `BIN: ${item.bin}`,
        `Country: ${item.country}`,
        `Type / Level: ${item.type || "N/A"} / ${item.level || "N/A"}`,
        `Class: ${item.class_type || "N/A"}`,
        `Code: ${item.code || "N/A"}`,
        `ZIP: ${item.zip || "N/A"}`,
        `Track 1: ${item.track1 ? "True" : "False"}`,
        `PIN: ${item.pin ? "True" : "False"}`,
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
      `Order placed for Dump #DMP-${item.id} ($${price.toFixed(2)}) under ${client.clientHandle}. Remaining balance: $${charge.nextBalance.toFixed(2)}`
    );
  };

  return (
    <div className="dumps-container">
      <form className="dumps-form" onSubmit={handleFilterSubmit}>
        <div className="dumps-card-header">
          Buy DUMPS
        </div>

        <div className="dumps-card-body">
          <div className="input-group-fields">
            {/* Base */}
            <div className="imputs">
              <label htmlFor="base">Base</label>
              <select
                id="base"
                value={base}
                onChange={(e) => setBase(e.target.value)}
              >
                <option value="">Select Base</option>
                <option value="EUROPE">EUROPE</option>
                <option value="USA">USA</option>
                <option value="CANADA">CANADA</option>
                <option value="ASIA">ASIA</option>
                <option value="WORLD MIX">WORLD MIX</option>
              </select>
            </div>

            {/* BIN */}
            <div className="imputs">
              <label htmlFor="bin">BIN</label>
              <input
                type="text"
                id="bin"
                placeholder="e.g. 541344"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
              />
            </div>

            {/* Country */}
            <div className="imputs">
              <label htmlFor="country">Country</label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select Country</option>
                <option value="Australia">Australia</option>
                <option value="United State">United State</option>
                <option value="Canada">Canada</option>
                <option value="Italy">Italy</option>
                <option value="United Kindom">United Kingdom</option>
                <option value="Europe">Europe</option>
              </select>
            </div>

            {/* Type */}
            <div className="imputs">
              <label htmlFor="type">Type</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="">Select Type</option>
                <option value="mastercard">Mastercard</option>
                <option value="visa">Visa</option>
                <option value="american express">American Express</option>
                <option value="discover">Discover</option>
              </select>
            </div>

            {/* Level */}
            <div className="imputs">
              <label htmlFor="level">Level</label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="">Select Level</option>
                <option value="Classic">Classic</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="World">World</option>
                <option value="Infinite">Infinite</option>
              </select>
            </div>

            {/* Class */}
            <div className="imputs">
              <label htmlFor="classOp">Class</label>
              <select
                id="classOp"
                value={classOp}
                onChange={(e) => setClassOp(e.target.value)}
              >
                <option value="">Select Class</option>
                <option value="Standard">Standard</option>
                <option value="Business">Business</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>

            {/* Code */}
            <div className="imputs">
              <label htmlFor="code">Code</label>
              <select
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              >
                <option value="">Select Code</option>
                <option value="101">101</option>
                <option value="201">201</option>
                <option value="220">220</option>
                <option value="221">221</option>
              </select>
            </div>

            {/* ZIP */}
            <div className="imputs">
              <label htmlFor="zip">ZIP</label>
              <input
                type="text"
                id="zip"
                placeholder="90210"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>

            {/* Checkboxes */}
            <div className="input-row">
              <label className="checkbox-label" htmlFor="track1">
                <input
                  type="checkbox"
                  id="track1"
                  className="checkbox-input"
                  checked={track1}
                  onChange={(e) => setTrack1(e.target.checked)}
                />
                Track 1 Required
              </label>

              <label className="checkbox-label" htmlFor="pin">
                <input
                  type="checkbox"
                  id="pin"
                  className="checkbox-input"
                  checked={withPin}
                  onChange={(e) => setWithPin(e.target.checked)}
                />
                With PIN Required
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="dumps-actions">
            <button type="submit" className="btn-apply">
              Apply filter
            </button>

            <button
              type="button"
              className="btn-clear"
              onClick={handleClear}
            >
              Clear filter
            </button>
          </div>
        </div>
      </form>

      {/* Dumps table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Base</th>
              <th>Bin</th>
              <th>Country</th>
              <th>Type / Level</th>
              <th>Code</th>
              <th>Zip</th>
              <th>Track 1</th>
              <th>PIN</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody id="body">
            {loading ? (
              <tr>
                <td colSpan="10" className="dump-empty-row">
                  Loading available dumps...
                </td>
              </tr>
            ) : dumpsList.length > 0 ? (
              dumpsList.map((item) => (
                <tr key={item.id}>
                  <td>{item.base}</td>
                  <td>
                    <code>{item.bin}</code>
                  </td>
                  <td>{item.country}</td>
                  <td style={{ textTransform: "capitalize" }}>
                    {item.type} / {item.level}
                  </td>
                  <td>{item.code || "N/A"}</td>
                  <td>{item.zip || "N/A"}</td>

                  <td style={{ textAlign: "center", fontSize: "1.1rem" }}>
                    {item.track1 ? (
                      <span style={{ color: "#059669" }} title="True">
                        ✔
                      </span>
                    ) : (
                      <span style={{ color: "#dc2626" }} title="False">
                        ❌
                      </span>
                    )}
                  </td>

                  <td style={{ textAlign: "center", fontSize: "1.1rem" }}>
                    {item.pin ? (
                      <span style={{ color: "#059669" }} title="True">
                        ✔
                      </span>
                    ) : (
                      <span style={{ color: "#dc2626" }} title="False">
                        ❌
                      </span>
                    )}
                  </td>

                  <td>
                    <strong>
                      ${Number(item.price).toFixed(2)}
                    </strong>
                  </td>

                  <td>
                    <button
                      onClick={() => handleBuyItem(item)}
                      style={{
                        backgroundColor: "#10b981",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
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
                <td colSpan="10" className="dump-empty-row">
                  No Dumps found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="novbv-table-footer">
        <div className="novbv-rows-selector">
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

        <div className="novbv-pagination">
          {renderPaginationButtons()}
        </div>
      </div>
    </div>
  );
}