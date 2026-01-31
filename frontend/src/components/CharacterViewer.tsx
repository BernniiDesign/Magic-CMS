import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaTimes, FaShieldAlt, FaStar, FaTrophy, FaHeart } from 'react-icons/fa';
import { GiCrossedSwords, GiHeartBottle, GiMagicSwirl, GiSwordsPower } from 'react-icons/gi';
import axios from 'axios';

interface CharacterViewerProps {
  isOpen: boolean;
  onClose: () => void;
  characterGuid: number;
}

export default function CharacterViewer({ isOpen, onClose, characterGuid }: CharacterViewerProps) {
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'achievements'>('stats');

  useEffect(() => {
    if (isOpen && characterGuid) {
      fetchCharacterDetails();
    }
  }, [isOpen, characterGuid]);

  const fetchCharacterDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3006/api/characters/${characterGuid}/details`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCharacter(response.data.character);
    } catch (error) {
      console.error('Error fetching character:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const classData: { [key: number]: { name: string; color: string } } = {
    1: { name: 'Warrior', color: 'from-[#C69B6D] to-[#8B7355]' },
    2: { name: 'Paladin', color: 'from-[#F48CBA] to-[#C96A94]' },
    3: { name: 'Hunter', color: 'from-[#AAD372] to-[#86A356]' },
    4: { name: 'Rogue', color: 'from-[#FFF468] to-[#CCC350]' },
    5: { name: 'Priest', color: 'from-[#FFFFFF] to-[#CCCCCC]' },
    6: { name: 'Death Knight', color: 'from-[#C41E3A] to-[#9A1829]' },
    7: { name: 'Shaman', color: 'from-[#0070DD] to-[#005AAA]' },
    8: { name: 'Mage', color: 'from-[#3FC7EB] to-[#2E9AC2]' },
    9: { name: 'Warlock', color: 'from-[#8788EE] to-[#6465BC]' },
    11: { name: 'Druid', color: 'from-[#FF7C0A] to-[#CC6308]' },
  };

  const raceData: { [key: number]: { name: string } } = {
    1: { name: 'Human' }, 2: { name: 'Orc' }, 3: { name: 'Dwarf' },
    4: { name: 'Night Elf' }, 5: { name: 'Undead' }, 6: { name: 'Tauren' },
    7: { name: 'Gnome' }, 8: { name: 'Troll' }, 10: { name: 'Blood Elf' },
    11: { name: 'Draenei' },
  };

  const getModelUrl = () => {
    if (!character) return '';
    // WoW Model Viewer URL format
    return `https://wow.zamimg.com/modelviewer/live/webthumbs/npc/130/25474.png`;
  };

  const classInfo = character ? classData[character.class] : null;
  const raceInfo = character ? raceData[character.race] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-dark-900 to-dark-800 rounded-2xl border-2 border-wow-gold/30 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
          >
            <FaTimes className="text-xl text-gray-400 hover:text-white" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-wow-gold"></div>
            </div>
          ) : character ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[90vh]">
              {/* Left: 3D Model */}
              <div className="space-y-4">
                {/* Character Info */}
                <div className="text-center">
                  <h2 className={`text-4xl font-bold bg-gradient-to-r ${classInfo?.color} bg-clip-text text-transparent mb-2`}>
                    {character.name}
                  </h2>
                  <p className="text-gray-400">
                    Level {character.level} {raceInfo?.name} {classInfo?.name}
                  </p>
                </div>

                {/* 3D Model Viewer */}
                <div className="relative aspect-square bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl border-2 border-dark-600 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <iframe
                      src={`https://wowhead.com/3d-character?race=${character.race}&gender=${character.gender}&class=${character.class}&level=${character.level}`}
                      className="w-full h-full"
                      style={{ border: 'none' }}
                      title="Character 3D Model"
                    />
                  </div>
                  {/* Fallback image */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-sm text-gray-500">Loading 3D Model...</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-dark-700/50 rounded-lg p-3 text-center">
                    <FaTrophy className="text-wow-gold mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Achievements</p>
                    <p className="text-lg font-bold text-wow-gold">{character.achievements?.length || 0}</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-3 text-center">
                    <GiCrossedSwords className="text-red-400 mx-auto mb-1 text-xl" />
                    <p className="text-xs text-gray-500">Kills</p>
                    <p className="text-lg font-bold text-white">{character.totalKills || 0}</p>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-3 text-center">
                    <FaStar className="text-wow-ice mx-auto mb-1" />
                    <p className="text-xs text-gray-500">Item Level</p>
                    <p className="text-lg font-bold text-wow-ice">N/A</p>
                  </div>
                </div>
              </div>

              {/* Right: Tabs */}
              <div className="space-y-4">
                {/* Tab buttons */}
                <div className="flex space-x-2 border-b border-dark-600">
                  {(['stats', 'equipment', 'achievements'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 font-medium capitalize transition-colors ${
                        activeTab === tab
                          ? 'text-wow-gold border-b-2 border-wow-gold'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {activeTab === 'stats' && character.stats && (
                    <StatsTab stats={character.stats} character={character} />
                  )}
                  {activeTab === 'equipment' && (
                    <EquipmentTab equipment={character.equipment || []} />
                  )}
                  {activeTab === 'achievements' && (
                    <AchievementsTab achievements={character.achievements || []} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-400">Character not found</p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Stats Tab
function StatsTab({ stats, character }: { stats: any; character: any }) {
  const statGroups = [
    {
      title: 'Health & Power',
      icon: FaHeart,
      color: 'text-red-400',
      stats: [
        { label: 'Health', value: stats.maxhealth, icon: GiHeartBottle },
        { label: 'Mana', value: stats.maxpower1, icon: GiMagicSwirl },
      ],
    },
    {
      title: 'Primary Stats',
      icon: FaShieldAlt,
      color: 'text-wow-gold',
      stats: [
        { label: 'Strength', value: stats.strength },
        { label: 'Agility', value: stats.agility },
        { label: 'Stamina', value: stats.stamina },
        { label: 'Intellect', value: stats.intellect },
        { label: 'Spirit', value: stats.spirit },
      ],
    },
    {
      title: 'Combat Stats',
      icon: GiSwordsPower,
      color: 'text-red-400',
      stats: [
        { label: 'Attack Power', value: stats.attackPower },
        { label: 'Spell Power', value: stats.spellPower },
        { label: 'Armor', value: stats.armor },
        { label: 'Crit %', value: stats.critPct?.toFixed(2) + '%' },
        { label: 'Dodge %', value: stats.dodgePct?.toFixed(2) + '%' },
        { label: 'Parry %', value: stats.parryPct?.toFixed(2) + '%' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {statGroups.map((group, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-dark-700/50 rounded-xl p-4 border border-dark-600"
        >
          <div className="flex items-center space-x-2 mb-3">
            <group.icon className={`${group.color} text-lg`} />
            <h3 className="font-semibold text-white">{group.title}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {group.stats.map((stat, statIdx) => (
              <div key={statIdx} className="flex justify-between items-center">
                <span className="text-sm text-gray-400">{stat.label}</span>
                <span className="font-semibold text-white">{stat.value || 0}</span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Equipment Tab
function EquipmentTab({ equipment }: { equipment: any[] }) {
  const slots: { [key: number]: string } = {
    0: 'Head', 1: 'Neck', 2: 'Shoulders', 3: 'Shirt', 4: 'Chest',
    5: 'Waist', 6: 'Legs', 7: 'Feet', 8: 'Wrists', 9: 'Hands',
    10: 'Finger 1', 11: 'Finger 2', 12: 'Trinket 1', 13: 'Trinket 2',
    14: 'Back', 15: 'Main Hand', 16: 'Off Hand', 17: 'Ranged', 18: 'Tabard',
  };

  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.entries(slots).map(([slotId, slotName]) => {
        const item = equipment.find((eq) => eq.slot === parseInt(slotId));
        return (
          <motion.div
            key={slotId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between bg-dark-700/50 rounded-lg p-3 border border-dark-600"
          >
            <span className="text-sm text-gray-400">{slotName}</span>
            {item ? (
              <div className="flex items-center space-x-2">
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/small/${item.entry}.jpg`}
                  alt="Item"
                  className="w-8 h-8 rounded border border-wow-gold/30"
                  onError={(e) => {
                    e.currentTarget.src = 'https://wow.zamimg.com/images/wow/icons/small/inv_misc_questionmark.jpg';
                  }}
                />
                <span className="text-sm text-wow-gold">Item {item.entry}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-600">Empty</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// Achievements Tab
function AchievementsTab({ achievements }: { achievements: any[] }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-12">
        <FaTrophy className="text-gray-600 text-5xl mx-auto mb-4" />
        <p className="text-gray-400">No achievements yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {achievements.slice(0, 20).map((achievement, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.02 }}
          className="flex items-center space-x-3 bg-dark-700/50 rounded-lg p-3 border border-dark-600 hover:border-wow-gold/30 transition-colors"
        >
          <FaTrophy className="text-wow-gold" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">Achievement #{achievement.achievement}</p>
            <p className="text-xs text-gray-500">
              {new Date(achievement.date * 1000).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}