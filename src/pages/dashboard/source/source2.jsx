import { useState } from "react";
import "../../../styles/dashboard/sources/source1.css";

export default function Source2() {
  const [source, setSource] = useState("Source 2");
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

  const handleClear = () => {
    setState("");
    setCity("");
    setZip("");
    setBank("");
    setCard("");
    setCardType("");
    setCardLevel("");
    setPriceFrom("");
    setPriceTo("");
    setWithZip(false);
    setPhone(false);
    setEmail(false);
    setDob(false);
    setBox(false);
    setBinList("");
  };

  return (
    <div className="source1-container">
      <h2 className="source1-header">Find and buy Cvv</h2>
      <p className="source1-subtitle">Filter Options</p>

      <div className="source1-filter-card">
        <div className="source1-grid">
          <div className="source1-box">
            <label htmlFor="source">Select Source</label>
            <select id="source" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="Source 1">Source 1</option>
              <option value="Source 2">Source 2</option>
              <option value="Source 3">Source 3</option>
            </select>
          </div>
          
          <div className="source1-box">
            <label htmlFor="state">State</label>
            <input id="state" type="text" placeholder="Enter state" value={state} onChange={(e) => setState(e.target.value)} />
          </div>

          <div className="source1-box">
            <label htmlFor="city">City</label>
            <input id="city" type="text" placeholder="Enter city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div className="source1-box">
            <label htmlFor="zip">Zip</label>
            <input id="zip" type="text" placeholder="Enter zip" value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>

          <div className="source1-box">
            <label htmlFor="bankName">Bank Name</label>
            <select id="bankName" value={bank} onChange={(e) => setBank(e.target.value)}>
              <option value="">Select Bank</option>
              <option value="Equity">Equity Bank</option>
            </select>
          </div>

          <div className="source1-box">
            <label htmlFor="card">Card Brand</label>
            <select id="card" value={card} onChange={(e) => setCard(e.target.value)}>
              <option value="">Select Brand</option>
            </select>
          </div>

          <div className="source1-box">
            <label htmlFor="cardType">Card Type</label>
            <select id="cardType" value={cardType} onChange={(e) => setCardType(e.target.value)}>
              <option value="">Select Type</option>
            </select>
          </div>

          <div className="source1-box">
            <label htmlFor="cardLevel">Card Level</label>
            <select id="cardLevel" value={cardLevel} onChange={(e) => setCardLevel(e.target.value)}>
              <option value="">Select Level</option>
            </select>
          </div>

          <div className="source1-box">
            <label htmlFor="priceFrom">Price From</label>
            <input id="priceFrom" type="text" placeholder="0.00" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />
          </div>

          <div className="source1-box">
            <label htmlFor="priceTo">Price To</label>
            <input id="priceTo" type="text" placeholder="0.00" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} />
          </div>

          <div className="source1-box">
            <label htmlFor="binList">Bin List</label>
            <input id="binList" type="text" placeholder="e.g. 453200" value={binList} onChange={(e) => setBinList(e.target.value)} />
          </div>

          <div className="source1-box" style={{ display: "none" }}></div>

          <div className="source1-box checkbox-box">
            <input id="withZip" type="checkbox" checked={withZip} onChange={(e) => setWithZip(e.target.checked)} />
            <label htmlFor="withZip">With Zip</label>
          </div>

          <div className="source1-box checkbox-box">
            <input id="phone" type="checkbox" checked={phone} onChange={(e) => setPhone(e.target.checked)} />
            <label htmlFor="phone">With Phone</label>
          </div>

          <div className="source1-box checkbox-box">
            <input id="email" type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />
            <label htmlFor="email">With Email</label>
          </div>

          <div className="source1-box checkbox-box">
            <input id="dob" type="checkbox" checked={dob} onChange={(e) => setDob(e.target.checked)} />
            <label htmlFor="dob">With DOB</label>
          </div>

          <div className="source1-box checkbox-box">
            <input id="box" type="checkbox" checked={box} onChange={(e) => setBox(e.target.checked)} />
            <label htmlFor="box">Not P.O. Box</label>
          </div>
        </div>

        <div className="source1-buttons">
          <button id="apply" className="source1-btn-apply">Apply Filters</button>
          <button id="clear" className="source1-btn-clear" onClick={handleClear}>Clear Filters</button>
        </div>
      </div>
    </div>
  );
}