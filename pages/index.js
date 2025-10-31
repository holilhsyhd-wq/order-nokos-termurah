import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [countries, setCountries] = useState([]);
  const [otpServices, setOtpServices] = useState([]);
  const [selectedService, setSelectedService] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedOtpService, setSelectedOtpService] = useState("");
  const [orders, setOrders] = useState([]);
  const [smsMap, setSmsMap] = useState({});
  const [quantity, setQuantity] = useState(1);

  // Load API Key dari browser
  useEffect(() => {
    const storedKey = localStorage.getItem("fastbit_api_key");
    if (storedKey) {
      setApiKey(storedKey);
      setLoggedIn(true);
      getServices();
      getProfile();
      getOrders();
    }
  }, []);

  const callFastBit = async (path, method = "GET", body = null) => {
    try {
      const res = await axios.post("/api/fastbit", { path, apiKey, method, body });
      return res.data;
    } catch (e) {
      console.error(e);
      alert("Gagal memuat data");
    }
  };

  const getProfile = async () => setProfile(await callFastBit("/profile"));
  const getServices = async () => setServices(await callFastBit("/services") || []);
  const getCountries = async (serviceId) => setCountries(await callFastBit(`/services/countries?application_id=${serviceId}`) || []);
  const getOtpServices = async (serviceId, countryId) => setOtpServices(await callFastBit(`/otp-services?service_id=${serviceId}&country_id=${countryId}`) || []);
  const getOrders = async () => {
    const activeOrders = await callFastBit("/virtual-number/orders/active") || [];
    setOrders(activeOrders);
    fetchAllSMS(activeOrders);
  };

  // Ambil SMS per order
  const fetchOrderSMS = async (uuid) => {
    const data = await callFastBit(`/virtual-number/orders/${uuid}`);
    setSmsMap(prev => ({ ...prev, [uuid]: data.sms_messages || [] }));
  };
  const fetchAllSMS = (ordersList) => {
    ordersList.forEach(order => fetchOrderSMS(order.uuid));
  };

  const generateOrder = async () => {
    if (!selectedOtpService) return alert("Pilih OTP Service");
    const data = await callFastBit(`/virtual-number/generate-order?otp_service_id=${selectedOtpService}&quantity=${quantity}`);
    alert(JSON.stringify(data));
    getOrders();
  };

  const finishOrder = async (uuid) => { await callFastBit(`/virtual-number/orders/${uuid}/finish`); getOrders(); };
  const cancelOrder = async (uuid) => { await callFastBit(`/virtual-number/orders/${uuid}/cancel`); getOrders(); };

  const handleLogin = () => {
    if (!apiKey) return alert("Masukkan API Key!");
    localStorage.setItem("fastbit_api_key", apiKey);
    setLoggedIn(true);
    getServices();
    getProfile();
    getOrders();
  };

  const handleLogout = () => {
    localStorage.removeItem("fastbit_api_key");
    setApiKey("");
    setLoggedIn(false);
  };

  // Auto-refresh saldo, order, SMS tiap 1 menit
  useEffect(() => {
    if (loggedIn) {
      const interval = setInterval(() => { getProfile(); getOrders(); }, 60000);
      return () => clearInterval(interval);
    }
  }, [loggedIn]);

  if (!loggedIn)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-md w-80 text-center">
          <h1 className="text-2xl font-bold mb-4 text-blue-600">FastBit Login</h1>
          <input type="password" placeholder="Masukkan API Key" className="border p-2 w-full rounded mb-3" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          <button onClick={handleLogin} className="bg-blue-500 text-white px-4 py-2 rounded w-full">Login</button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-600">⚡ FastBit Dashboard</h1>
          <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
        </div>

        <button onClick={getProfile} className="bg-blue-500 text-white px-4 py-2 rounded mb-3">💰 Refresh Saldo</button>
        {profile && <pre className="bg-gray-50 border p-4 rounded mb-4">{JSON.stringify(profile, null, 2)}</pre>}

        <div className="mb-4">
          <h2 className="font-bold mb-2">Generate Order</h2>
          <div className="flex flex-wrap gap-2 mb-2">
            <select className="border p-2 rounded" value={selectedService} onChange={(e) => { setSelectedService(e.target.value); getCountries(e.target.value); setSelectedCountry(""); setSelectedOtpService(""); }}>
              <option value="">Pilih Service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.application_name}</option>)}
            </select>
            <select className="border p-2 rounded" value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); getOtpServices(selectedService, e.target.value); setSelectedOtpService(""); }}>
              <option value="">Pilih Negara</option>
              {countries.map(c => <option key={c.id} value={c.id}>{c.country_name}</option>)}
            </select>
            <select className="border p-2 rounded" value={selectedOtpService} onChange={(e) => setSelectedOtpService(e.target.value)}>
              <option value="">Pilih OTP Service</option>
              {otpServices.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <input type="number" min="1" max="3" value={quantity} onChange={(e)=>setQuantity(e.target.value)} className="border p-2 rounded w-20" />
            <button onClick={generateOrder} className="bg-green-500 text-white px-4 py-2 rounded">Generate</button>
          </div>
        </div>

        <h2 className="font-bold mb-2">Active Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Number</th>
                <th className="p-2 border">Service</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions & SMS OTP</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.uuid}>
                  <td className="p-2 border">{o.number}</td>
                  <td className="p-2 border">{o.service_name}</td>
                  <td className="p-2 border">{o.status}</td>
                  <td className="p-2 border flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button onClick={()=>finishOrder(o.uuid)} className="bg-blue-500 text-white px-2 py-1 rounded">Finish</button>
                      <button onClick={()=>cancelOrder(o.uuid)} className="bg-red-500 text-white px-2 py-1 rounded">Cancel</button>
                      <button onClick={()=>fetchOrderSMS(o.uuid)} className="bg-yellow-500 text-white px-2 py-1 rounded">Refresh SMS</button>
                    </div>
                    {smsMap[o.uuid] && smsMap[o.uuid].length > 0 && (
                      <div className="mt-1 p-2 bg-gray-50 border rounded text-sm">
                        {smsMap[o.uuid].map((sms, i) => <div key={i} className="mb-1">• {sms.message}</div>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
