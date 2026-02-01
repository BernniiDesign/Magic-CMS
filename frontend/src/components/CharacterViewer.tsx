// frontend/src/components/CharacterViewer.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ItemTooltip } from './ItemTooltip';
import { FaTimes, FaShieldAlt, FaStar, FaTrophy, FaHeart, FaSkull, FaBolt } from 'react-icons/fa';
import { 
  GiCrossedSwords, 
  GiMagicSwirl, 
  GiSwordsPower,
  GiHealthPotion,
  GiMuscleUp,
  GiRunningNinja,
  GiBrain,
  GiSparkSpirit,
  GiCheckedShield,
  GiPunchBlast
} from 'react-icons/gi';
import { charactersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ItemIcon } from './ItemIcon';

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, characterGuid]);

  const fetchCharacterDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 [CharacterViewer] Fetching details for GUID:', characterGuid);
      
      const response = await charactersAPI.getCharacterDetails(characterGuid);
      
      console.log('✅ [CharacterViewer] Character loaded:', response.data);
      setCharacter(response.data.character);
    } catch (error: any) {
      console.error('❌ [CharacterViewer] Error fetching character:', error);
      
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view this character');
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Error loading character data');
      }
      
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const classData: { [key: number]: { name: string; color: string; icon: string } } = {
    1: { name: 'Warrior', color: 'from-[#C69B6D] to-[#8B7355]', icon: '⚔️' },
    2: { name: 'Paladin', color: 'from-[#F48CBA] to-[#C96A94]', icon: '🛡️' },
    3: { name: 'Hunter', color: 'from-[#AAD372] to-[#86A356]', icon: '🏹' },
    4: { name: 'Rogue', color: 'from-[#FFF468] to-[#CCC350]', icon: '🗡️' },
    5: { name: 'Priest', color: 'from-[#FFFFFF] to-[#CCCCCC]', icon: '✨' },
    6: { name: 'Death Knight', color: 'from-[#C41E3A] to-[#9A1829]', icon: '💀' },
    7: { name: 'Shaman', color: 'from-[#0070DD] to-[#005AAA]', icon: '⚡' },
    8: { name: 'Mage', color: 'from-[#3FC7EB] to-[#2E9AC2]', icon: '🔮' },
    9: { name: 'Warlock', color: 'from-[#8788EE] to-[#6465BC]', icon: '🔥' },
    11: { name: 'Druid', color: 'from-[#FF7C0A] to-[#CC6308]', icon: '🌿' },
  };

  const raceData: { [key: number]: { name: string; faction: string } } = {
    1: { name: 'Human', faction: 'Alliance' },
    2: { name: 'Orc', faction: 'Horde' },
    3: { name: 'Dwarf', faction: 'Alliance' },
    4: { name: 'Night Elf', faction: 'Alliance' },
    5: { name: 'Undead', faction: 'Horde' },
    6: { name: 'Tauren', faction: 'Horde' },
    7: { name: 'Gnome', faction: 'Alliance' },
    8: { name: 'Troll', faction: 'Horde' },
    10: { name: 'Blood Elf', faction: 'Horde' },
    11: { name: 'Draenei', faction: 'Alliance' },
  };

  const classInfo = character ? classData[character.class] : null;
  const raceInfo = character ? raceData[character.race] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-7xl max-h-[95vh] overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-2xl border-2 border-wow-gold/40 shadow-2xl shadow-wow-gold/20"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-wow-gold to-transparent" />
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-3 bg-dark-700/80 hover:bg-red-600/80 rounded-lg transition-all border border-dark-600 hover:border-red-500"
          >
            <FaTimes className="text-xl text-gray-400 hover:text-white" />
          </motion.button>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-dark-600 border-t-wow-gold"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <GiMagicSwirl className="text-wow-gold text-2xl animate-pulse" />
                </div>
              </div>
              <p className="text-gray-400 animate-pulse">Loading character data...</p>
            </div>
          ) : character ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 overflow-y-auto max-h-[95vh]">
              
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-2"
                >
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <span className="text-4xl">{classInfo?.icon}</span>
                    <h2 className={`text-5xl font-bold bg-gradient-to-r ${classInfo?.color} bg-clip-text text-transparent`}>
                      {character.name}
                    </h2>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 text-gray-300">
                    <span className="px-3 py-1 bg-dark-700/50 rounded-full text-sm border border-dark-600">
                      Level {character.level}
                    </span>
                    <span className="px-3 py-1 bg-dark-700/50 rounded-full text-sm border border-dark-600">
                      {raceInfo?.name}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm border ${
                      raceInfo?.faction === 'Alliance' 
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                        : 'bg-red-600/20 border-red-500/50 text-red-400'
                    }`}>
                      {raceInfo?.faction}
                    </span>
                  </div>
                  
                  <p className={`text-lg font-medium bg-gradient-to-r ${classInfo?.color} bg-clip-text text-transparent`}>
                    {classInfo?.name}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative aspect-square bg-gradient-to-br from-dark-800 to-dark-700 rounded-xl border-2 border-dark-600 overflow-hidden shadow-lg"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-dark-800/50">
                    <div className="text-center space-y-4">
                      <img
                        src={`https://wow.zamimg.com/images/wow/icons/large/race_${raceInfo?.name.toLowerCase().replace(' ', '')}_${character.gender === 0 ? 'male' : 'female'}.jpg`}
                        alt={raceInfo?.name}
                        className="w-32 h-32 mx-auto rounded-full border-4 border-wow-gold/50 shadow-xl"
                        onError={(e) => {
                          e.currentTarget.src = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                        }}
                      />
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">3D Model Preview</p>
                        <p className="text-xs text-gray-600">
                          Race: {raceInfo?.name} | Gender: {character.gender === 0 ? 'Male' : 'Female'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-wow-gold/50"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-wow-gold/50"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-wow-gold/50"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-wow-gold/50"></div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-3 gap-3"
                >
                  <QuickStatCard
                    icon={<FaTrophy className="text-wow-gold" />}
                    label="Achievements"
                    value={character.achievements?.length || 0}
                    color="wow-gold"
                  />
                  <QuickStatCard
                    icon={<GiCrossedSwords className="text-red-400" />}
                    label="Kills"
                    value={character.totalKills || 0}
                    color="red"
                  />
                  <QuickStatCard
                    icon={<FaStar className="text-wow-ice" />}
                    label="Honor"
                    value={character.totalHonorPoints || 0}
                    color="wow-ice"
                  />
                </motion.div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                
                <div className="flex space-x-2 border-b-2 border-dark-600">
                  {(['stats', 'equipment', 'achievements'] as const).map((tab) => (
                    <motion.button
                      key={tab}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab(tab)}
                      className={`relative px-6 py-3 font-bold capitalize transition-all ${
                        activeTab === tab
                          ? 'text-wow-gold'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-wow-gold to-transparent"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800">
                  {activeTab === 'stats' && character.stats && (
                    <StatsTab stats={character.stats} />
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
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <FaSkull className="text-6xl text-gray-600" />
              <p className="text-xl text-gray-400">Character not found</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== COMPONENTS ====================

function QuickStatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string 
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      className="bg-gradient-to-br from-dark-700 to-dark-800 rounded-xl p-4 text-center border-2 border-dark-600 hover:border-wow-gold/30 transition-all shadow-lg"
    >
      <div className="mb-2 flex justify-center text-2xl">
        {icon}
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${
        color === 'wow-gold' ? 'text-wow-gold' : 
        color === 'red' ? 'text-red-400' : 
        'text-wow-ice'
      }`}>
        {value.toLocaleString()}
      </p>
    </motion.div>
  );
}

function StatsTab({ stats }: { stats: any }) {
  const statGroups = [
    {
      title: 'Health & Power',
      icon: GiHealthPotion,
      color: 'text-red-400',
      borderColor: 'border-red-500/30',
      bgGradient: 'from-red-600/10 to-dark-800',
      stats: [
        { label: 'Health', value: stats.maxhealth || 0, icon: <FaHeart className="text-red-500" /> },
        { label: 'Mana', value: stats.maxpower1 || 0, icon: <GiMagicSwirl className="text-blue-400" /> },
        { label: 'Energy', value: stats.maxpower4 || 0, icon: <FaBolt className="text-yellow-400" /> },
      ],
    },
    {
      title: 'Primary Attributes',
      icon: GiMuscleUp,
      color: 'text-wow-gold',
      borderColor: 'border-wow-gold/30',
      bgGradient: 'from-wow-gold/10 to-dark-800',
      stats: [
        { label: 'Strength', value: stats.strength || 0, icon: <GiMuscleUp className="text-red-400" /> },
        { label: 'Agility', value: stats.agility || 0, icon: <GiRunningNinja className="text-green-400" /> },
        { label: 'Stamina', value: stats.stamina || 0, icon: <GiHealthPotion className="text-orange-400" /> },
        { label: 'Intellect', value: stats.intellect || 0, icon: <GiBrain className="text-blue-400" /> },
        { label: 'Spirit', value: stats.spirit || 0, icon: <GiSparkSpirit className="text-purple-400" /> },
      ],
    },
    {
      title: 'Combat Statistics',
      icon: GiSwordsPower,
      color: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      bgGradient: 'from-orange-600/10 to-dark-800',
      stats: [
        { label: 'Attack Power', value: stats.attackPower || 0, icon: <GiPunchBlast className="text-red-400" /> },
        { label: 'Spell Power', value: stats.spellPower || 0, icon: <GiMagicSwirl className="text-purple-400" /> },
        { label: 'Armor', value: stats.armor || 0, icon: <GiCheckedShield className="text-gray-400" /> },
        { label: 'Critical Strike', value: (stats.critPct || 0).toFixed(2) + '%', icon: <FaStar className="text-yellow-400" /> },
        { label: 'Dodge', value: (stats.dodgePct || 0).toFixed(2) + '%', icon: <GiRunningNinja className="text-green-400" /> },
        { label: 'Parry', value: (stats.parryPct || 0).toFixed(2) + '%', icon: <FaShieldAlt className="text-blue-400" /> },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {statGroups.map((group, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`bg-gradient-to-r ${group.bgGradient} rounded-xl p-5 border-2 ${group.borderColor} shadow-lg`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <group.icon className={`${group.color} text-2xl`} />
            <h3 className="font-bold text-white text-lg">{group.title}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {group.stats.map((stat, statIdx) => (
              <motion.div 
                key={statIdx} 
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between bg-dark-900/50 rounded-lg p-3 border border-dark-700"
              >
                <div className="flex items-center space-x-2">
                  {stat.icon}
                  <span className="text-sm text-gray-400">{stat.label}</span>
                </div>
                <span className="font-bold text-white text-lg">
                  {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

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
            whileHover={{ scale: 1.02, x: 4 }}
            className="flex items-center justify-between bg-dark-700/50 rounded-lg p-3 border border-dark-600 hover:border-wow-gold/50 transition-all"
          >
            <span className="text-sm font-medium text-gray-400 min-w-[100px]">
              {slotName}
            </span>
            
            {item ? (
              <div className="flex items-center space-x-3 flex-1">
                {/* ✅ Icono simple: solo necesita icon, name, quality */}
                <ItemIcon
                  icon={item.icon}
                  name={item.name}
                  quality={item.quality}
                  size="small"
                />
                
                {/* Nombre con tooltip */}
                <ItemTooltip
                  itemId={item.itemEntry}
                  enchantId={parseEnchant(item.enchantmentsParsed)}
                  gems={parseGems(item.enchantmentsParsed)}
                  className={`text-sm font-medium hover:text-wow-ice transition-colors flex-1 min-w-0 truncate ${getQualityTextClass(item.quality)}`}
                >
                  {item.name}
                </ItemTooltip>
                
                {/* Gemas/encantamientos */}
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {parseGems(item.enchantmentsParsed).map((gemId, idx) => (
                    <GemIndicator key={idx} gemId={gemId} />
                  ))}
                  {parseEnchant(item.enchantmentsParsed) && <EnchantIndicator />}
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-600 italic">Empty</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
// Helper para color de texto según calidad
function getQualityTextClass(quality: number): string {
  const classes: Record<number, string> = {
    0: 'text-gray-500',      // Poor
    1: 'text-white',         // Common
    2: 'text-green-400',     // Uncommon
    3: 'text-blue-400',      // Rare
    4: 'text-purple-400',    // Epic
    5: 'text-orange-400',    // Legendary
    6: 'text-yellow-400',    // Artifact
    7: 'text-cyan-400',      // Heirloom
  };
  return classes[quality] || 'text-white';
}

function parseEnchant(enchantmentsParsed: any): number | undefined {
  return enchantmentsParsed?.permanent;
}

function parseGems(enchantmentsParsed: any): number[] {
  return enchantmentsParsed?.gems || [];
}

function GemIndicator({ gemId }: { gemId: number }) {
  return (
    <ItemTooltip itemId={gemId} className="inline-block">
      <div className="w-4 h-4 rounded-full border border-purple-500 bg-purple-900/50 hover:bg-purple-800/70 transition-colors cursor-pointer" />
    </ItemTooltip>
  );
}

function EnchantIndicator() {
  return (
    <div className="px-2 py-0.5 bg-green-900/30 border border-green-600/50 rounded text-xs text-green-400 hover:bg-green-800/50 transition-colors cursor-help">
      <FaBolt className="inline w-3 h-3" />
    </div>
  );
}

function AchievementsTab({ achievements }: { achievements: any[] }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <FaTrophy className="text-gray-600 text-6xl mx-auto opacity-50" />
        <p className="text-gray-400 text-lg">No achievements unlocked yet</p>
        <p className="text-gray-600 text-sm">Complete challenges to earn achievements!</p>
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
          whileHover={{ scale: 1.02, x: 4 }}
          className="flex items-center space-x-3 bg-dark-700/50 rounded-lg p-4 border border-dark-600 hover:border-wow-gold/30 transition-all shadow-md"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-wow-gold to-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
            <FaTrophy className="text-dark-900 text-xl" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Achievement #{achievement.achievement}</p>
            <p className="text-xs text-gray-500">
              Completed: {new Date(achievement.date * 1000).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <FaStar className="text-wow-gold text-lg" />
        </motion.div>
      ))}
    </div>
  );
}