import { motion } from 'framer-motion';
import { FaClock, FaMapMarkerAlt, FaCoins, FaSkull } from 'react-icons/fa';

interface CharacterCardProps {
  character: any;
  index: number;
  onClick?: () => void;
}

export default function CharacterCard({ character, index, onClick }: CharacterCardProps) {
  // Class data
  const classData: { [key: number]: { name: string; color: string; icon: string } } = {
    1: { name: 'Warrior', color: 'from-[#C69B6D] to-[#8B7355]', icon: 'warrior' },
    2: { name: 'Paladin', color: 'from-[#F48CBA] to-[#C96A94]', icon: 'paladin' },
    3: { name: 'Hunter', color: 'from-[#AAD372] to-[#86A356]', icon: 'hunter' },
    4: { name: 'Rogue', color: 'from-[#FFF468] to-[#CCC350]', icon: 'rogue' },
    5: { name: 'Priest', color: 'from-[#FFFFFF] to-[#CCCCCC]', icon: 'priest' },
    6: { name: 'Death Knight', color: 'from-[#C41E3A] to-[#9A1829]', icon: 'deathknight' },
    7: { name: 'Shaman', color: 'from-[#0070DD] to-[#005AAA]', icon: 'shaman' },
    8: { name: 'Mage', color: 'from-[#3FC7EB] to-[#2E9AC2]', icon: 'mage' },
    9: { name: 'Warlock', color: 'from-[#8788EE] to-[#6465BC]', icon: 'warlock' },
    11: { name: 'Druid', color: 'from-[#FF7C0A] to-[#CC6308]', icon: 'druid' },
  };

  // Race data
  const raceData: { [key: number]: { name: string; faction: string; icon: string } } = {
    1: { name: 'Human', faction: 'Alliance', icon: 'human' },
    2: { name: 'Orc', faction: 'Horde', icon: 'orc' },
    3: { name: 'Dwarf', faction: 'Alliance', icon: 'dwarf' },
    4: { name: 'Night Elf', faction: 'Alliance', icon: 'nightelf' },
    5: { name: 'Undead', faction: 'Horde', icon: 'scourge' },
    6: { name: 'Tauren', faction: 'Horde', icon: 'tauren' },
    7: { name: 'Gnome', faction: 'Alliance', icon: 'gnome' },
    8: { name: 'Troll', faction: 'Horde', icon: 'troll' },
    10: { name: 'Blood Elf', faction: 'Horde', icon: 'bloodelf' },
    11: { name: 'Draenei', faction: 'Alliance', icon: 'draenei' },
  };

  // Zone data (principales)
  const zoneData: { [key: number]: string } = {
    1: 'Dun Morogh', 12: 'Elwynn Forest', 14: 'Durotar', 17: 'The Barrens',
    85: 'Tirisfal Glades', 141: 'Teldrassil', 215: 'Mulgore', 3430: 'Eversong Woods',
    3524: 'Azuremyst Isle', 1519: 'Stormwind City', 1537: 'Ironforge', 1657: 'Darnassus',
    1637: 'Orgrimmar', 1638: 'Thunder Bluff', 1497: 'Undercity', 3487: 'Silvermoon City',
    3557: 'The Exodar', 4395: 'Dalaran', 67: 'Dalaran (Crystalsong)', 
    // Northrend zones
    3537: 'Borean Tundra', 495: 'Howling Fjord', 3711: 'Sholazar Basin',
    65: 'Dragonblight', 66: 'Zul\'Drak', 67: 'The Storm Peaks', 210: 'Icecrown',
  };

  const classInfo = classData[character.class] || { name: 'Unknown', color: 'from-gray-500 to-gray-700', icon: 'inv_misc_questionmark' };
  const raceInfo = raceData[character.race] || { name: 'Unknown', faction: 'Neutral', icon: 'inv_misc_questionmark' };
  const zoneName = zoneData[character.zone] || `Zone ${character.zone}`;

  const formatPlaytime = (totaltime: number) => {
    const hours = Math.floor(totaltime / 3600);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    const minutes = Math.floor(totaltime / 60);
    return `${minutes}m`;
  };

  const formatGold = (copper: number) => {
    const gold = Math.floor(copper / 10000);
    const silver = Math.floor((copper % 10000) / 100);
    return { gold, silver };
  };

  const money = formatGold(character.money);
  const factionColor = raceInfo.faction === 'Alliance' ? 'from-blue-600 to-blue-800' : 'from-red-600 to-red-800';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative group"
    >
      {/* Card */}
      <div 
        onClick={onClick}
        className="relative bg-gradient-to-br from-dark-800 to-dark-900 border-2 border-dark-600 rounded-xl overflow-hidden hover:border-wow-gold/50 transition-all duration-300 cursor-pointer"
      >
        {/* Class gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${classInfo.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
        
        {/* Faction banner */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${factionColor} opacity-10 transform rotate-45 translate-x-12 -translate-y-12`} />
        
        {/* Content */}
        <div className="relative p-6 space-y-4">
          {/* Header with icons */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {/* Race Icon */}
              <div className="relative">
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/large/race_${raceInfo.icon}_${character.gender === 0 ? 'male' : 'female'}.jpg`}
                  alt={raceInfo.name}
                  className="w-12 h-12 rounded-lg border-2 border-dark-600 group-hover:border-wow-gold/50 transition-colors"
                  onError={(e) => {
                    // Fallback to generic icon if race icon fails
                    e.currentTarget.src = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                  }}
                />
                {/* Level badge */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-wow-gold to-yellow-600 rounded-full flex items-center justify-center text-xs font-bold text-dark-900 border-2 border-dark-800">
                  {character.level}
                </div>
              </div>

              {/* Class Icon */}
              <div className="relative">
                <img
                  src={`https://wow.zamimg.com/images/wow/icons/large/classicon_${classInfo.icon}.jpg`}
                  alt={classInfo.name}
                  className="w-12 h-12 rounded-lg border-2 border-dark-600 group-hover:border-wow-gold/50 transition-colors"
                  onError={(e) => {
                    e.currentTarget.src = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg';
                  }}
                />
              </div>

              {/* Name and Info */}
              <div>
                <h3 className={`text-xl font-bold bg-gradient-to-r ${classInfo.color} bg-clip-text text-transparent`}>
                  {character.name}
                </h3>
                <p className="text-sm text-gray-400">
                  {raceInfo.name} {classInfo.name}
                </p>
              </div>
            </div>

            {/* Online badge */}
            {character.online === 1 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center space-x-1 px-2 py-1 bg-green-600/20 border border-green-500/30 rounded-full"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-400">Online</span>
              </motion.div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Location */}
            <div className="flex items-center space-x-2 p-2 bg-dark-700/50 rounded-lg">
              <FaMapMarkerAlt className="text-wow-ice text-sm flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium text-gray-300 truncate">{zoneName}</p>
              </div>
            </div>

            {/* Playtime */}
            <div className="flex items-center space-x-2 p-2 bg-dark-700/50 rounded-lg">
              <FaClock className="text-wow-blue text-sm flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Playtime</p>
                <p className="text-sm font-medium text-gray-300">{formatPlaytime(character.totaltime)}</p>
              </div>
            </div>

            {/* Gold */}
            <div className="flex items-center space-x-2 p-2 bg-dark-700/50 rounded-lg">
              <FaCoins className="text-wow-gold text-sm flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Gold</p>
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-wow-gold">{money.gold}</span>
                  <span className="text-xs text-gray-400">g</span>
                  <span className="text-xs font-medium text-gray-400">{money.silver}</span>
                  <span className="text-xs text-gray-500">s</span>
                </div>
              </div>
            </div>

            {/* Deaths (if tracked) */}
            {character.totalKills !== undefined && (
              <div className="flex items-center space-x-2 p-2 bg-dark-700/50 rounded-lg">
                <FaSkull className="text-red-400 text-sm flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Kills</p>
                  <p className="text-sm font-medium text-gray-300">{character.totalKills || 0}</p>
                </div>
              </div>
            )}
          </div>

          {/* Faction indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-700">
            <span className={`text-xs font-medium ${raceInfo.faction === 'Alliance' ? 'text-blue-400' : 'text-red-400'}`}>
              {raceInfo.faction}
            </span>
            <button className="text-xs text-gray-400 hover:text-wow-gold transition-colors">
              Click to View Details →
            </button>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-wow-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </motion.div>
  );
}
