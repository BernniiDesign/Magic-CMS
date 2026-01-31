import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaServer, FaUsers, FaGamepad, FaChartLine } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import { serverAPI } from '../services/api';

export default function Home() {
  const { data: statusData } = useQuery({
    queryKey: ['server-status'],
    queryFn: () => serverAPI.getStatus(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: statsData } = useQuery({
    queryKey: ['server-stats'],
    queryFn: () => serverAPI.getStats(),
    refetchInterval: 60000, // Refetch every minute
  });

  const realms = statusData?.data?.realms || [];
  const stats = statsData?.data?.stats || {};

  const features = [
    {
      icon: FaServer,
      title: 'Stable Server',
      description: '99.9% uptime with dedicated hardware',
      color: 'from-blue-500 to-blue-700',
    },
    {
      icon: FaUsers,
      title: 'Active Community',
      description: 'Join thousands of active players',
      color: 'from-purple-500 to-purple-700',
    },
    {
      icon: FaGamepad,
      title: 'Custom Content',
      description: 'Unique quests and custom events',
      color: 'from-green-500 to-green-700',
    },
    {
      icon: FaChartLine,
      title: 'Balanced Rates',
      description: 'Perfect progression experience',
      color: 'from-orange-500 to-orange-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-purple-900/20" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-7xl font-bold mb-6"
            >
              <span className="text-gradient">Trinity</span> Server
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto"
            >
              Experience World of Warcraft like never before on our premium 3.3.5a server
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Link to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-lg px-8 py-3"
                >
                  Create Account
                </motion.button>
              </Link>
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-secondary text-lg px-8 py-3"
                >
                  Sign In
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Server Status Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Server <span className="text-gradient">Status</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {realms.map((realm: any, index: number) => (
              <motion.div
                key={realm.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="card card-hover"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{realm.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${realm.online ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                    <span className={`text-sm font-medium ${realm.online ? 'text-green-400' : 'text-red-400'}`}>
                      {realm.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">
                  {realm.address}:{realm.port}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="text-sm text-gray-400">
                    Players Online: <span className="text-primary-400 font-semibold">{realm.playersOnline || 0}</span>
                  </div>
                  {realm.uptime && realm.online && (
                    <div className="text-xs text-gray-500">
                      Uptime: {realm.uptime}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Server Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Server <span className="text-gradient">Statistics</span>
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Accounts" value={stats.totalAccounts || 0} />
            <StatCard title="Characters" value={stats.totalCharacters || 0} />
            <StatCard title="Online Now" value={stats.charactersOnline || 0} color="text-green-400" />
            <StatCard title="Alliance" value={stats.allianceCharacters || 0} color="text-blue-400" />
            <StatCard title="Horde" value={stats.hordeCharacters || 0} color="text-red-400" />
            <StatCard title="Max Level" value={stats.maxLevel || 0} color="text-yellow-400" />
          </div>
        </motion.div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Why Choose <span className="text-gradient">Us</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="card"
              >
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.color} mb-4`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = 'text-primary-400' }: { title: string; value: number; color?: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="card text-center"
    >
      <div className={`text-3xl font-bold ${color} mb-1`}>
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-400">{title}</div>
    </motion.div>
  );
}