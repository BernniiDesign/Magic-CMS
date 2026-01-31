import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { FaUser, FaEnvelope, FaGamepad } from 'react-icons/fa';
import { useAuthStore } from '../store/authStore';
import { charactersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import CharacterCard from '../components/CharacterCard';
import CharacterViewer from '../components/CharacterViewer';
import { useState } from 'react';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const { data: charactersData, isLoading } = useQuery({
    queryKey: ['account-characters', user?.id],
    queryFn: () => user?.id ? charactersAPI.getAccountCharacters(user.id) : null,
    enabled: !!user?.id,
  });

  const characters = charactersData?.data?.characters || [];

  const handleCharacterClick = (guid: number) => {
    setSelectedCharacter(guid);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
    setSelectedCharacter(null);
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-wow-gold via-white to-wow-ice bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Welcome back, {user?.username}!</p>
          </div>
        </motion.div>

        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-8"
        >
          <h2 className="text-2xl font-bold mb-6 text-wow-gold">Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-wow-gold/20 rounded-lg">
                <FaUser className="h-6 w-6 text-wow-gold" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Username</p>
                <p className="font-semibold">{user?.username}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600/20 rounded-lg">
                <FaEnvelope className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="font-semibold">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-wow-ice/20 rounded-lg">
                <FaGamepad className="h-6 w-6 text-wow-ice" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Characters</p>
                <p className="font-semibold">{characters.length}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Characters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <h2 className="text-2xl font-bold mb-6 text-wow-gold">Your Characters</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wow-gold"></div>
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center py-12">
              <FaGamepad className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No characters found</p>
              <p className="text-gray-500 text-sm mt-2">
                Create a character in-game to see it here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char: any, index: number) => (
                <CharacterCard 
                  key={char.guid} 
                  character={char} 
                  index={index}
                  onClick={() => handleCharacterClick(char.guid)}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Character Viewer Modal */}
        {selectedCharacter && (
          <CharacterViewer
            isOpen={viewerOpen}
            onClose={handleCloseViewer}
            characterGuid={selectedCharacter}
          />
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card text-center border-2 border-transparent hover:border-wow-gold/30 transition-all"
          >
            <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Check our guides and documentation
            </p>
            <button className="btn-secondary w-full">View Guides</button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card text-center border-2 border-transparent hover:border-wow-gold/30 transition-all"
          >
            <h3 className="text-lg font-semibold mb-2">Vote for Us</h3>
            <p className="text-sm text-gray-400 mb-4">
              Support the server and earn rewards
            </p>
            <button className="relative px-6 py-2 rounded-lg font-medium overflow-hidden group w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-wow-gold to-wow-ice opacity-100 group-hover:opacity-90 transition-opacity" />
              <span className="relative text-dark-900 font-semibold">Vote Now</span>
            </button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="card text-center border-2 border-transparent hover:border-wow-gold/30 transition-all"
          >
            <h3 className="text-lg font-semibold mb-2">Donate</h3>
            <p className="text-sm text-gray-400 mb-4">
              Support development and get perks
            </p>
            <button className="btn-secondary w-full">View Shop</button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
