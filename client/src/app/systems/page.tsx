'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Initial Mock Data
const SYSTEM_DATA = {
    name: "VertiGrow Tower V2",
    id: "#8839",
    hash: "0x71C7656EC7ab88b098defB751B7401B5f6d89A23",
    status: "Healthy",
    image: "/assets/images/systems/tower.jpg",
    purchaseDate: "Oct 20, 2024",
    manufacturer: "EcoLab Industries",
    manufacturerUrl: "#",
    materials: "100% Recycled HDPE",
    plasticRepurposed: "12.5 lbs",
    location: "Ubud, Bali",
    plantSlots: 32,
    team: [
        { role: "Owner", name: "Kismet (You)", address: "0x12..34" },
        { role: "Maintenance", name: "Budi Santoso", address: "0x99..88" },
    ],
    gallery: [
        "/assets/images/systems/gallery_seedlings.png",
        "/assets/images/systems/gallery_growth.png",
        "/assets/images/systems/gallery_blooming.png"
    ]
};

const INITIAL_INVENTORY = [
    { id: 1, type: "Bok Choy", planted: "Oct 20", harvestEst: "Nov 25", slotId: 4 },
    { id: 2, type: "Kale", planted: "Oct 22", harvestEst: "Dec 05", slotId: 12 },
    { id: 3, type: "Basil", planted: "Oct 25", harvestEst: "Nov 20", slotId: 14 },
    { id: 4, type: "Spinach", planted: "Oct 25", harvestEst: "Nov 22", slotId: 15 },
    { id: 5, type: "Bok Choy", planted: "Oct 26", harvestEst: "Dec 01", slotId: 16 },
];

const INITIAL_HARVEST_LOG = [
    { id: 101, type: "Spinach", date: "Oct 15", yield: "1.2 kg" },
    { id: 102, type: "Basil", date: "Oct 01", yield: "250g" },
];

const INITIAL_CARE_LOG = [
    { id: 201, action: "Nutrient Refill", date: "Oct 24", notes: "Added A+B Solution" },
    { id: 202, action: "Pruning", date: "Oct 20", notes: "Removed dead leaves" },
];

const AI_SCHEDULE = [
    { id: 1, task: "Nutrient Refill", due: "Tomorrow", priority: "High", type: "maintenance" },
    { id: 2, task: "Harvest Basil", due: "In 2 days", priority: "Medium", type: "harvest" },
    { id: 3, task: "Check pH Levels", due: "In 3 days", priority: "Low", type: "check" },
];

const AI_SUGGESTIONS = [
    { id: 1, text: "pH is trending high. Consider adding 'Ph-Down' solution.", productLink: "#" },
    { id: 2, text: "Whiteflies detected in region. Preventive Neem Oil spray recommended.", productLink: "#" },
];

const MOCK_REPORTS = [
    { id: 1, name: "October 2024 Report.pdf", date: "Oct 31, 2024", size: "1.2 MB" },
    { id: 2, name: "September 2024 Report.pdf", date: "Sept 30, 2024", size: "1.1 MB" },
];

const MOCK_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SystemsPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'journal' | 'info' | 'gallery' | 'reports'>('journal');
    const [showReportModal, setShowReportModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Collapsible State
    const [showAllInventory, setShowAllInventory] = useState(false);
    const [showAllCare, setShowAllCare] = useState(false);
    const [showAllHarvest, setShowAllHarvest] = useState(false);

    // Report Generation State
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

    // AI Chat State
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { id: 1, role: 'ai', text: "Hello! I've analyzed your system reports. How can I help you optimize your growth today?" }
    ]);

    // Interactive State
    const [inventory, setInventory] = useState(INITIAL_INVENTORY);
    const [harvestLog, setHarvestLog] = useState(INITIAL_HARVEST_LOG);
    const [careLog, setCareLog] = useState(INITIAL_CARE_LOG);

    // Form State
    const [reportType, setReportType] = useState('care'); // care, harvest, note
    const [selectedPlantType, setSelectedPlantType] = useState('');
    const [formData, setFormData] = useState({
        action: 'Nutrient Refill',
        notes: '',
        yieldAmount: '',
        yieldUnit: 'g'
    });

    // Computed Stats
    const usedSlots = inventory.length;
    const availableSlots = SYSTEM_DATA.plantSlots - usedSlots;
    const plantCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        inventory.forEach(p => counts[p.type] = (counts[p.type] || 0) + 1);
        return counts;
    }, [inventory]);

    // Derived Unique Plant Types for Dropdown
    const availableTypes = useMemo(() => Array.from(new Set(inventory.map(p => p.type))), [inventory]);

    const handleSaveReport = () => {
        const date = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

        if (reportType === 'care') {
            const newEntry = {
                id: Date.now(),
                action: formData.action,
                date: date,
                notes: `${selectedPlantType ? `[${selectedPlantType}] ` : ''}${formData.notes}`
            };
            setCareLog([newEntry, ...careLog]);
        } else if (reportType === 'harvest') {
            if (!selectedPlantType) return; // Must select a plant

            // Remove one instance of the selected plant type (FIFO)
            const plantToRemoveIndex = inventory.findIndex(p => p.type === selectedPlantType);
            if (plantToRemoveIndex !== -1) {
                const newInventory = [...inventory];
                newInventory.splice(plantToRemoveIndex, 1);
                setInventory(newInventory);

                // Add to Harvest Log
                const newHarvest = {
                    id: Date.now(),
                    type: selectedPlantType,
                    date: date,
                    yield: `${formData.yieldAmount} ${formData.yieldUnit}`
                };
                setHarvestLog([newHarvest, ...harvestLog]);
            }
        } else if (reportType === 'note') {
            const newEntry = {
                id: Date.now(),
                action: "Daily Log",
                date: date,
                notes: formData.notes
            };
            setCareLog([newEntry, ...careLog]);
        }

        setShowReportModal(false);
        // Reset Form
        setFormData({ action: 'Nutrient Refill', notes: '', yieldAmount: '', yieldUnit: 'g' });
        setSelectedPlantType('');
    };

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const newMsg = { id: Date.now(), role: 'user', text: chatInput };
        setChatMessages([...chatMessages, newMsg]);
        setChatInput('');

        // Mock Response
        setTimeout(() => {
            setChatMessages(prev => [...prev, { id: Date.now() + 1, role: 'ai', text: "Based on the October report, your pH levels fluctuated slightly. I recommend checking your nutrient solution balance closer to the harvest dates." }]);
        }, 1000);
    };

    const toggleMonth = (month: string) => {
        if (selectedMonths.includes(month)) {
            setSelectedMonths(selectedMonths.filter(m => m !== month));
        } else {
            setSelectedMonths([...selectedMonths, month]);
        }
    };

    const handleDownloadReport = () => {
        if (selectedMonths.length === 0) return;
        alert(`Downloading reports for: ${selectedMonths.join(', ')}`);
        setShowGenerateModal(false);
        setSelectedMonths([]);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header & Immutable Identity Card */}
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                <div className="flex flex-col md:flex-row gap-8 relative z-10">
                    {/* System Image */}
                    <div className="w-full md:w-1/3 aspect-[3/4] rounded-2xl overflow-hidden relative shadow-md">
                        <Image src={SYSTEM_DATA.image} alt={SYSTEM_DATA.name} fill className="object-cover" />
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-green-700 shadow-sm border border-green-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {SYSTEM_DATA.status}
                        </div>
                    </div>

                    {/* Identity Info */}
                    <div className="flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-wider">NFT ID: {SYSTEM_DATA.id}</span>
                                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded font-bold border border-green-100">Verified Authentic</span>
                                    </div>
                                    <h1 className="text-3xl font-bold text-gray-900">{SYSTEM_DATA.name}</h1>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push('/wallet')}
                                        className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition flex items-center gap-2 shadow-sm"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                        Sell / Transfer
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm font-mono text-gray-400 break-all mb-6 bg-gray-50 p-2 rounded-lg border border-gray-100 select-all">
                                {SYSTEM_DATA.hash}
                            </p>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Manufacturer</p>
                                    <p className="text-gray-800 font-medium">{SYSTEM_DATA.manufacturer}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Material</p>
                                    <p className="text-gray-800 font-medium">{SYSTEM_DATA.materials}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Repurposed Plastic</p>
                                    <p className="text-green-600 font-bold">{SYSTEM_DATA.plasticRepurposed}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Plant Slots</p>
                                    <p className="text-gray-800 font-medium">{SYSTEM_DATA.plantSlots}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Location</p>
                                    <p className="text-gray-800 font-medium">{SYSTEM_DATA.location}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Ownership</p>
                                    <div className="flex -space-x-2 mt-1">
                                        <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-green-800" title="You">K</div>
                                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-800" title="Maintainer">B</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex gap-4">
                                <button onClick={() => setActiveTab('journal')} className={`text-sm font-bold pb-2 border-b-2 transition ${activeTab === 'journal' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Production Journal</button>
                                <button onClick={() => setActiveTab('gallery')} className={`text-sm font-bold pb-2 border-b-2 transition ${activeTab === 'gallery' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Growth Gallery</button>
                                <button onClick={() => setActiveTab('reports')} className={`text-sm font-bold pb-2 border-b-2 transition ${activeTab === 'reports' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>System Reports</button>
                            </div>
                            <button
                                onClick={() => setShowReportModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-green-200 transition flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Update Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB CONTENT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === 'journal' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

                            {/* Living Inventory (With Interactive Slots) */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        Living Inventory
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Capacity</p>
                                            <p className={`text-sm font-bold ${availableSlots < 5 ? 'text-amber-500' : 'text-green-600'}`}>{usedSlots} / {SYSTEM_DATA.plantSlots}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Available</p>
                                            <p className="text-sm font-bold text-gray-800">{availableSlots}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Plant Breakdown Chips */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {Object.entries(plantCounts).map(([type, count]) => (
                                        <span key={type} className="bg-green-50 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                                            {type}: {count}
                                        </span>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {(showAllInventory ? inventory : inventory.slice(0, 2)).map(plant => (
                                        <div key={plant.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-800 text-xs font-bold">
                                                    {plant.type.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{plant.type} <span className="text-gray-400 font-normal">#{plant.slotId}</span></p>
                                                    <p className="text-[10px] text-gray-500">Planted: {plant.planted}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400 font-medium">Est. Harvest</p>
                                                <p className="text-green-600 font-bold text-sm">{plant.harvestEst}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {inventory.length > 2 && (
                                        <button
                                            onClick={() => setShowAllInventory(!showAllInventory)}
                                            className="w-full py-1 text-xs font-bold text-green-600 hover:text-green-700 transition"
                                        >
                                            {showAllInventory ? "Show Less" : `Show All (${inventory.length})`}
                                        </button>
                                    )}
                                    <button className="w-full py-2 text-sm text-gray-400 font-bold border border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:text-green-600 transition">+ Add Plant</button>
                                </div>
                            </div>

                            {/* Stacked Logs (Restored Layout) */}
                            <div className="space-y-6">
                                {/* Care Log */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                        Care Log
                                    </h3>
                                    <div className="relative pl-6 space-y-6 border-l-2 border-gray-100">
                                        {(showAllCare ? careLog : careLog.slice(0, 2)).map(log => (
                                            <div key={log.id} className="relative animate-in slide-in-from-left-2 fade-in duration-300">
                                                <div className="absolute -left-[31px] w-4 h-4 rounded-full bg-blue-100 border-2 border-white "></div>
                                                <p className="text-xs font-bold text-gray-400 mb-1 leading-none">{log.date}</p>
                                                <h4 className="text-sm font-bold text-gray-800">{log.action}</h4>
                                                <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg">{log.notes}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {careLog.length > 2 && (
                                        <button
                                            onClick={() => setShowAllCare(!showAllCare)}
                                            className="w-full mt-4 py-1 text-xs font-bold text-blue-500 hover:text-blue-600 transition"
                                        >
                                            {showAllCare ? "Show Less" : "Show All"}
                                        </button>
                                    )}
                                </div>

                                {/* Harvest Log */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                        Harvest Log
                                    </h3>
                                    <div className="space-y-3">
                                        {(showAllHarvest ? harvestLog : harvestLog.slice(0, 2)).map(log => (
                                            <div key={log.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl opacity-75 hover:opacity-100 transition animate-in fade-in duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold grayscale">
                                                        {log.type.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-700 text-sm line-through decoration-gray-400">{log.type}</p>
                                                        <p className="text-[10px] text-gray-400">Harvested: {log.date}</p>
                                                    </div>
                                                </div>
                                                <p className="text-amber-600 font-bold text-sm bg-amber-50 px-2 py-1 rounded">{log.yield}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {harvestLog.length > 2 && (
                                        <button
                                            onClick={() => setShowAllHarvest(!showAllHarvest)}
                                            className="w-full mt-4 py-1 text-xs font-bold text-amber-600 hover:text-amber-700 transition"
                                        >
                                            {showAllHarvest ? "Show Less" : "Show All"}
                                        </button>
                                    )}
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'gallery' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900">Growth Gallery</h3>
                                    <button className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-500 font-bold hover:bg-gray-200 transition">
                                        Visibility: Public 🟢
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {SYSTEM_DATA.gallery.map((img, i) => (
                                        <div key={i} className="aspect-square bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer flex items-center justify-center relative overflow-hidden group">
                                            <Image src={img} alt={`Growth ${i}`} fill className="object-cover" />
                                            <button className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                    <div className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-green-400 hover:text-green-500 transition cursor-pointer">
                                        <span className="text-2xl mb-1">+</span>
                                        <span className="text-xs font-bold">Upload Photo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {/* AI Analysis Chat */}
                            <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">System Intelligence</h3>
                                            <p className="text-xs text-indigo-300">AI Report Analyst</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-800/50 rounded-xl p-4 h-64 overflow-y-auto mb-4 space-y-4 no-scrollbar">
                                        {chatMessages.map(msg => (
                                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-200 rounded-tl-none'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Ask insights about your reports..."
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-indigo-500 transition text-sm"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="absolute right-2 top-2 p-1.5 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-900">System Reports</h3>
                                    <button className="text-xs px-3 py-1 bg-green-50 rounded-full text-green-700 font-bold hover:bg-green-100 transition flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Generate New Report
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {MOCK_REPORTS.map(report => (
                                        <div key={report.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-sm">{report.name}</h4>
                                                    <p className="text-xs text-gray-500">{report.date} • {report.size}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => alert(`Downloading ${report.name}...`)}
                                                className="px-4 py-2 bg-white text-gray-700 text-xs font-bold rounded-lg border border-gray-200 hover:border-green-500 hover:text-green-600 transition shadow-sm"
                                            >
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Schedule & Metrics */}
                <div className="space-y-6">

                    {/* Schedule & AI Assistant */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 rounded-2xl shadow-lg text-white border border-indigo-700 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>

                        <h3 className="font-bold mb-4 flex items-center gap-2 relative z-10">
                            <svg className="w-5 h-5 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Schedule & AI Tips
                        </h3>

                        <div className="space-y-3 relative z-10">
                            {AI_SCHEDULE.map(item => (
                                <div key={item.id} className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 hover:bg-white/20 transition">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-sm">{item.task}</p>
                                            <p className="text-xs text-indigo-200">Due: {item.due}</p>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.priority === 'High' ? 'bg-red-500/20 text-red-100' : 'bg-green-500/20 text-green-100'}`}>
                                            {item.priority}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/10 relative z-10">
                            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">AI Suggestion</p>
                            {AI_SUGGESTIONS.map(sug => (
                                <div key={sug.id} className="flex gap-2 mb-2 last:mb-0">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></div>
                                    <p className="text-xs text-indigo-100">
                                        {sug.text} <a href={sug.productLink} className="underline text-white font-bold hover:text-indigo-200">View Product</a>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Metrics Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Performance Metrics</h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Power Usage</span>
                                    <span className="font-bold text-gray-900">45 kWh/mo</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-yellow-400 h-1.5 rounded-full w-[45%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Water Efficiency</span>
                                    <span className="font-bold text-green-600">92%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-green-500 h-1.5 rounded-full w-[92%]"></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-500">Monthly Yield</span>
                                    <span className="font-bold text-gray-900">3.2 kg</span>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-xs uppercase tracking-wide transition flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Generate Report (PDF)
                        </button>
                    </div>

                    {/* Equipment Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">System Equipment</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Growth LED (Full Spec)</p>
                                    <p className="text-xs text-gray-500">Schedule: 06:00 - 20:00 (14h)</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">240W • Active</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">Water Pump</p>
                                    <p className="text-xs text-gray-500">Cycle: 15m ON / 45m OFF</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">25W • Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Service Report Form Modal */}
            <AnimatePresence>
                {showReportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Production Report</h2>
                            <p className="text-gray-500 text-sm mb-6">Log new activities to the system's ledger.</p>

                            {/* Report Type Selector */}
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                                {['care', 'harvest', 'note'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setReportType(t)}
                                        className={`flex-1 py-2 text-sm font-bold capitalize rounded-lg transition ${reportType === t ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {t === 'note' ? 'General Note' : t}
                                    </button>
                                ))}
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-4">
                                {/* Plant Type Dropdown (Shared for Care & Harvest) */}
                                {reportType !== 'note' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Target Plant Profile</label>
                                        <select
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                            value={selectedPlantType}
                                            onChange={(e) => setSelectedPlantType(e.target.value)}
                                        >
                                            <option value="">-- Select Plant Type --</option>
                                            {availableTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                        {reportType === 'harvest' && !selectedPlantType && <p className="text-red-500 text-xs mt-1">Required for harvest</p>}
                                    </div>
                                )}

                                {reportType === 'care' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Action Type</label>
                                            <select
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                                value={formData.action}
                                                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                                            >
                                                <option>Nutrient Refill</option>
                                                <option>Pruning</option>
                                                <option>Pest Treatment</option>
                                                <option>Pollination</option>
                                                <option>Cleaning</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Notes / Observation</label>
                                            <textarea
                                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none h-24"
                                                placeholder="Describe what you did..."
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            ></textarea>
                                        </div>
                                    </>
                                )}

                                {reportType === 'harvest' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">Yield Weight</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                                    placeholder="0.00"
                                                    value={formData.yieldAmount}
                                                    onChange={(e) => setFormData({ ...formData, yieldAmount: e.target.value })}
                                                />
                                                <select
                                                    className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                                    value={formData.yieldUnit}
                                                    onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                                                >
                                                    <option value="g">g</option>
                                                    <option value="kg">kg</option>
                                                    <option value="oz">oz</option>
                                                    <option value="lbs">lbs</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {reportType === 'note' && (
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Daily Log</label>
                                        <textarea
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none h-32"
                                            placeholder="Record daily observations, water pH readings, etc..."
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button onClick={() => setShowReportModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition">
                                        Cancel
                                    </button>
                                    <button onClick={handleSaveReport} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition">
                                        Save Entry
                                    </button>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Report Generation Modal */}
            <AnimatePresence>
                {showGenerateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
                        >
                            <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>

                            <h2 className="text-xl font-bold text-gray-900 mb-2">Generate System Report</h2>
                            <p className="text-gray-500 text-sm mb-6">Select the months you want to include in your downloadable report.</p>

                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {MOCK_MONTHS.map(month => (
                                    <button
                                        key={month}
                                        onClick={() => toggleMonth(month)}
                                        className={`py-2 text-xs font-bold rounded-lg border transition ${selectedMonths.includes(month) ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {month}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleDownloadReport}
                                disabled={selectedMonths.length === 0}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${selectedMonths.length === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Report ({selectedMonths.length})
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
