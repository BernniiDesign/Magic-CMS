// frontend/src/components/CharacterViewer.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ItemTooltip } from './ItemTooltip';
import { EnchantmentTooltip } from './EnchantmentTooltip';
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

// ✅ HELPER: Clase CSS para colores de calidad
function getQualityTextClass(quality: number): string {
  const qualityClasses: { [key: number]: string } = {
    0: 'text-gray-400',
    1: 'text-white',
    2: 'text-green-400',
    3: 'text-blue-400',
    4: 'text-purple-500',
    5: 'text-orange-500',
    6: 'text-yellow-400',
    7: 'text-cyan-400',
  };
  return qualityClasses[quality] || 'text-white';
}

// ✅ HELPER: Clase CSS para bordes de calidad
function getQualityBorderClass(quality: number): string {
  const qualityBorders: { [key: number]: string } = {
    0: 'border-gray-600/50',
    1: 'border-gray-500/50',
    2: 'border-green-500/50',
    3: 'border-blue-500/50',
    4: 'border-purple-500/50',
    5: 'border-orange-500/50',
    6: 'border-yellow-500/50',
    7: 'border-cyan-500/50',
  };
  return qualityBorders[quality] || 'border-gray-500/50';
}

export default function CharacterViewer({ isOpen, onClose, characterGuid }: CharacterViewerProps) {
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'equipment' | 'achievements'>('equipment');

  useEffect(() => {
    if (isOpen && characterGuid) {
      fetchCharacterDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, characterGuid]);

  const fetchCharacterDetails = async () => {
    try {
      setLoading(true);
      const response = await charactersAPI.getCharacterDetails(characterGuid);
      setCharacter(response.data.character);
    } catch (error: any) {
      console.error('❌ [CharacterViewer] Error:', error);
      
      if (error.response?.status === 403) {
        toast.error('No tienes permisos para ver este personaje');
      } else if (error.response?.status === 401) {
        toast.error('Sesión expirada. Inicia sesión nuevamente.');
      } else {
        toast.error('Error al cargar datos del personaje');
      }
      
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const classData: { [key: number]: { name: string; color: string; icon: string } } = {
    1: { name: 'Guerrero', color: 'from-[#C69B6D] to-[#8B7355]', icon: '⚔️' },
    2: { name: 'Paladín', color: 'from-[#F48CBA] to-[#C96A94]', icon: '🛡️' },
    3: { name: 'Cazador', color: 'from-[#AAD372] to-[#86A356]', icon: '🏹' },
    4: { name: 'Pícaro', color: 'from-[#FFF468] to-[#CCC350]', icon: '🗡️' },
    5: { name: 'Sacerdote', color: 'from-[#FFFFFF] to-[#CCCCCC]', icon: '✨' },
    6: { name: 'Caballero de la Muerte', color: 'from-[#C41E3A] to-[#9A1829]', icon: '💀' },
    7: { name: 'Chamán', color: 'from-[#0070DD] to-[#005AAA]', icon: '⚡' },
    8: { name: 'Mago', color: 'from-[#3FC7EB] to-[#2E9AC2]', icon: '🔮' },
    9: { name: 'Brujo', color: 'from-[#8788EE] to-[#6465BC]', icon: '🔥' },
    11: { name: 'Druida', color: 'from-[#FF7C0A] to-[#CC6308]', icon: '🌿' },
  };

  const raceData: { [key: number]: { name: string; faction: string } } = {
    1: { name: 'Humano', faction: 'Alianza' },
    2: { name: 'Orco', faction: 'Horda' },
    3: { name: 'Enano', faction: 'Alianza' },
    4: { name: 'Elfo de la Noche', faction: 'Alianza' },
    5: { name: 'No-muerto', faction: 'Horda' },
    6: { name: 'Tauren', faction: 'Horda' },
    7: { name: 'Gnomo', faction: 'Alianza' },
    8: { name: 'Trol', faction: 'Horda' },
    10: { name: 'Elfo de Sangre', faction: 'Horda' },
    11: { name: 'Draenei', faction: 'Alianza' },
  };

  const classInfo = character ? classData[character.class] : null;
  const raceInfo = character ? raceData[character.race] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[1400px] max-h-[95vh] overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-2xl border-2 border-wow-gold/40 shadow-2xl shadow-wow-gold/20"
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
              <p className="text-gray-400 animate-pulse text-sm">Cargando datos del personaje...</p>
            </div>
          ) : character ? (
            <div className="overflow-y-auto max-h-[95vh]">
              <CharacterHeader character={character} classInfo={classInfo} raceInfo={raceInfo} />

              <div className="px-8 py-4 border-b border-dark-600">
                <div className="flex space-x-2">
                  {(['equipment', 'stats', 'achievements'] as const).map((tab) => {
                    const tabLabels = {
                      equipment: 'Equipamiento',
                      stats: 'Estadísticas',
                      achievements: 'Logros'
                    };
                    
                    return (
                      <motion.button
                        key={tab}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-6 py-2.5 text-sm font-semibold transition-all rounded-t-lg ${
                          activeTab === tab
                            ? 'text-wow-gold bg-dark-800/50'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-dark-800/30'
                        }`}
                      >
                        {tabLabels[tab]}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-wow-gold to-transparent"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="p-8">
                {activeTab === 'equipment' && (
                  <ModernEquipmentView equipment={character.equipment || []} />
                )}
                {activeTab === 'stats' && character.stats && (
                  <StatsTab stats={character.stats} />
                )}
                {activeTab === 'achievements' && (
                  <AchievementsTab achievements={character.achievements || []} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
              <FaSkull className="text-6xl text-gray-600" />
              <p className="text-xl text-gray-400">Personaje no encontrado</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-sm"
              >
                Cerrar
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== HEADER COMPONENT ====================

function CharacterHeader({ character, classInfo, raceInfo }: any) {
  return (
    <div className="relative bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900 p-8 border-b border-dark-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <img
              src={`https://wow.zamimg.com/images/wow/icons/large/race_${raceInfo?.name.toLowerCase().replace(' ', '')}_${character.gender === 0 ? 'male' : 'female'}.jpg`}
              alt={raceInfo?.name}
              className="w-20 h-20 rounded-full border-4 border-wow-gold shadow-xl"
              onError={(e) => {
                e.currentTarget.src = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
              }}
            />
            <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-br from-wow-gold to-yellow-600 text-dark-900 font-bold rounded-full w-8 h-8 flex items-center justify-center text-sm border-2 border-dark-900">
              {character.level}
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <span className="text-3xl">{classInfo?.icon}</span>
              <h2 className={`text-3xl font-bold bg-gradient-to-r ${classInfo?.color} bg-clip-text text-transparent`}>
                {character.name}
              </h2>
              {character.online === 1 && (
                <div className="flex items-center space-x-1 px-2.5 py-1 bg-green-600/20 border border-green-500/30 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-green-400">En línea</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2.5 text-xs">
              <span className={`font-medium bg-gradient-to-r ${classInfo?.color} bg-clip-text text-transparent`}>
                {classInfo?.name}
              </span>
              <span className="text-gray-500">•</span>
              <span className="text-gray-400">{raceInfo?.name}</span>
              <span className="text-gray-500">•</span>
              <span className={raceInfo?.faction === 'Alianza' ? 'text-blue-400' : 'text-red-400'}>
                {raceInfo?.faction}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <QuickStatCard
            icon={<FaTrophy className="text-wow-gold" />}
            label="Logros"
            value={character.achievements?.length || 0}
            color="wow-gold"
          />
          <QuickStatCard
            icon={<GiCrossedSwords className="text-red-400" />}
            label="Asesinatos"
            value={character.totalKills || 0}
            color="red"
          />
          <QuickStatCard
            icon={<FaStar className="text-wow-ice" />}
            label="Honor"
            value={character.totalHonorPoints || 0}
            color="wow-ice"
          />
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({ icon, label, value, color }: any) {
  return (
    <div className="bg-dark-800/50 rounded-lg p-2.5 text-center border border-dark-600">
      <div className="mb-1 flex justify-center text-lg">
        {icon}
      </div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${
        color === 'wow-gold' ? 'text-wow-gold' : 
        color === 'red' ? 'text-red-400' : 
        'text-wow-ice'
      }`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

// ==================== MODERN EQUIPMENT VIEW ====================

function ModernEquipmentView({ equipment }: { equipment: any[] }) {
  const slotNames: { [key: number]: string } = {
    0: 'Cabeza', 1: 'Cuello', 2: 'Hombros', 3: 'Camisa', 4: 'Pecho',
    5: 'Cintura', 6: 'Piernas', 7: 'Pies', 8: 'Muñecas', 9: 'Manos',
    10: 'Dedo 1', 11: 'Dedo 2', 12: 'Alhaja 1', 13: 'Alhaja 2',
    14: 'Espalda', 15: 'Mano principal', 16: 'Mano secundaria', 17: 'A distancia', 18: 'Tabardo',
  };

  const leftSlots = [0, 1, 2, 14, 4, 8, 9, 5];
  const rightSlots = [6, 7, 10, 11, 12, 13, 15, 16, 17];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-1.5">
        {leftSlots.map((slotId) => {
          const item = equipment.find((eq) => eq.slot === slotId);
          return <EquipmentSlot key={slotId} slotId={slotId} slotName={slotNames[slotId]} item={item} />;
        })}
      </div>

      <div className="flex items-center justify-center">
        <div className="relative w-full aspect-square max-w-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border-2 border-dark-600 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-wow-gold/5 via-transparent to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <GiSwordsPower className="text-wow-gold text-7xl mx-auto opacity-30" />
                <p className="text-gray-500 text-xs">Modelo del Personaje</p>
                <p className="text-gray-600 text-[10px]">Próximamente</p>
              </div>
            </div>
          </div>
          
          <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-wow-gold/50"></div>
          <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-wow-gold/50"></div>
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-wow-gold/50"></div>
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-wow-gold/50"></div>
        </div>
      </div>

      <div className="space-y-1.5">
        {rightSlots.map((slotId) => {
          const item = equipment.find((eq) => eq.slot === slotId);
          return <EquipmentSlot key={slotId} slotId={slotId} slotName={slotNames[slotId]} item={item} />;
        })}
      </div>
    </div>
  );
}

// ✅ EQUIPMENT SLOT - MINIMALISTA Y LIMPIO
function EquipmentSlot({ slotId, slotName, item }: { slotId: number; slotName: string; item: any }) {
  if (!item) {
    return (
      <div className="flex items-center justify-between bg-dark-700/20 rounded-md px-2.5 py-2 border border-dark-600/30">
        <span className="text-[11px] font-medium text-gray-600 uppercase tracking-wide">{slotName}</span>
        <span className="text-[10px] text-gray-700 italic">Vacío</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: slotId * 0.015 }}
      whileHover={{ scale: 1.01, x: 2 }}
      className={`bg-dark-700/30 rounded-md px-2.5 py-2 border hover:border-wow-gold/40 transition-all ${getQualityBorderClass(item.quality)}`}
    >
      {/* Fila única compacta */}
      <div className="flex items-center gap-2.5">
        {/* Slot name + iLvl */}
        <div className="flex items-center gap-2 min-w-[85px]">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{slotName}</span>
          {item.itemLevel && (
            <span className="text-[9px] font-bold text-wow-gold/80 bg-dark-900/40 px-1.5 py-0.5 rounded">
              {item.itemLevel}
            </span>
          )}
        </div>

        {/* Item icon */}
        <ItemIcon icon={item.icon} name={item.name} quality={item.quality} size="small" />

        {/* Item name */}
        <ItemTooltip
          itemId={item.itemEntry}
          enchantItemId={item.enchantData?.itemId}
          gemItemIds={item.gemsData?.map((g: any) => g.itemId).filter(Boolean)}
          prismaticItemId={item.prismaticData?.itemId}
          randomProperty={item.randomProperty}
          className={`flex-1 text-xs font-medium hover:text-wow-ice transition-colors truncate ${getQualityTextClass(item.quality)}`}
        >
          {item.name}
        </ItemTooltip>

        {/* Gemas */}
        {item.enchantmentsParsed?.gems?.map((gemEnchId: number, idx: number) => {
          const gemData = item.gemsData?.find((g: any) => g.enchantmentId === gemEnchId);
          return gemEnchId > 0 ? (
            <EnchantmentTooltip
              key={`gem-${slotId}-${idx}`}
              enchantmentId={gemEnchId}
              type="gem"
              className="inline-block"
            >
              <div className={`w-3.5 h-3.5 rounded-full border cursor-help hover:scale-110 transition-transform ${getGemColor(idx)}`} title={gemData?.name || `Gema ${gemEnchId}`} />
            </EnchantmentTooltip>
          ) : null;
        })}

        {/* Enchant */}
        {item.enchantmentsParsed?.permanent && (
          <EnchantmentTooltip
            enchantmentId={item.enchantmentsParsed.permanent}
            type="enchant"
            className="inline-block"
          >
            <div className="w-4 h-4 flex items-center justify-center bg-green-600/20 border border-green-500/40 rounded cursor-help hover:bg-green-600/30 transition-colors" title={item.enchantData?.name || `Encantamiento ${item.enchantmentsParsed.permanent}`}>
              <FaBolt className="w-2 h-2 text-green-400" />
            </div>
          </EnchantmentTooltip>
        )}
      </div>
    </motion.div>
  );
}

// ✅ Gem colors helper
function getGemColor(idx: number): string {
  const colors = [
    'bg-purple-600 border-purple-400',
    'bg-red-600 border-red-400',
    'bg-blue-600 border-blue-400',
    'bg-yellow-600 border-yellow-400',
  ];
  return colors[idx] || 'bg-gray-600 border-gray-400';
}

// ==================== STATS TAB ====================

function StatsTab({ stats }: { stats: any }) {
  const statGroups = [
    {
      title: 'Salud y Poder',
      icon: GiHealthPotion,
      color: 'text-red-400',
      borderColor: 'border-red-500/30',
      bgGradient: 'from-red-600/10 to-dark-800',
      stats: [
        { label: 'Salud', value: stats.maxhealth || 0, icon: <FaHeart className="text-red-500" /> },
        { label: 'Maná', value: stats.maxpower1 || 0, icon: <GiMagicSwirl className="text-blue-400" /> },
        { label: 'Energía', value: stats.maxpower4 || 0, icon: <FaBolt className="text-yellow-400" /> },
      ],
    },
    {
      title: 'Atributos Principales',
      icon: GiMuscleUp,
      color: 'text-wow-gold',
      borderColor: 'border-wow-gold/30',
      bgGradient: 'from-wow-gold/10 to-dark-800',
      stats: [
        { label: 'Fuerza', value: stats.strength || 0, icon: <GiMuscleUp className="text-red-400" /> },
        { label: 'Agilidad', value: stats.agility || 0, icon: <GiRunningNinja className="text-green-400" /> },
        { label: 'Aguante', value: stats.stamina || 0, icon: <GiHealthPotion className="text-orange-400" /> },
        { label: 'Intelecto', value: stats.intellect || 0, icon: <GiBrain className="text-blue-400" /> },
        { label: 'Espíritu', value: stats.spirit || 0, icon: <GiSparkSpirit className="text-purple-400" /> },
      ],
    },
    {
      title: 'Estadísticas de Combate',
      icon: GiSwordsPower,
      color: 'text-orange-400',
      borderColor: 'border-orange-500/30',
      bgGradient: 'from-orange-600/10 to-dark-800',
      stats: [
        { label: 'Poder de Ataque', value: stats.attackPower || 0, icon: <GiPunchBlast className="text-red-400" /> },
        { label: 'Poder de Hechizos', value: stats.spellPower || 0, icon: <GiMagicSwirl className="text-purple-400" /> },
        { label: 'Armadura', value: stats.armor || 0, icon: <GiCheckedShield className="text-gray-400" /> },
        { label: 'Golpe Crítico', value: (stats.critPct || 0).toFixed(2) + '%', icon: <FaStar className="text-yellow-400" /> },
        { label: 'Esquivar', value: (stats.dodgePct || 0).toFixed(2) + '%', icon: <GiRunningNinja className="text-green-400" /> },
        { label: 'Parar', value: (stats.parryPct || 0).toFixed(2) + '%', icon: <FaShieldAlt className="text-blue-400" /> },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {statGroups.map((group, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className={`bg-gradient-to-r ${group.bgGradient} rounded-xl p-6 border-2 ${group.borderColor} shadow-lg`}
        >
          <div className="flex items-center space-x-3 mb-4">
            <group.icon className={`${group.color} text-3xl`} />
            <h3 className="font-bold text-white text-xl">{group.title}</h3>
          </div>
          <div className="space-y-3">
            {group.stats.map((stat, statIdx) => (
              <div 
                key={statIdx} 
                className="flex items-center justify-between bg-dark-900/50 rounded-lg p-3 border border-dark-700"
              >
                <div className="flex items-center space-x-3">
                  {stat.icon}
                  <span className="text-sm text-gray-300">{stat.label}</span>
                </div>
                <span className="font-bold text-white text-lg">
                  {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ==================== ACHIEVEMENTS TAB ====================

function AchievementsTab({ achievements }: { achievements: any[] }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <FaTrophy className="text-gray-600 text-6xl mx-auto opacity-50" />
        <p className="text-gray-400 text-lg">No hay logros desbloqueados aún</p>
        <p className="text-gray-600 text-sm">¡Completa desafíos para obtener logros!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.slice(0, 30).map((achievement, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.02 }}
          whileHover={{ scale: 1.05, y: -2 }}
          className="flex items-center space-x-3 bg-gradient-to-br from-dark-800 to-dark-700 rounded-lg p-4 border-2 border-dark-600 hover:border-wow-gold/30 transition-all shadow-md"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-wow-gold to-yellow-600 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0">
            <FaTrophy className="text-dark-900 text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">Logro #{achievement.achievement}</p>
            <p className="text-xs text-gray-500">
              {new Date(achievement.date * 1000).toLocaleDateString('es-ES', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}