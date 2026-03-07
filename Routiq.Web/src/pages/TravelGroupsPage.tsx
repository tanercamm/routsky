import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, KeyRound, Map, Zap, ChevronRight, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { routiqApi } from '../api/routiqApi';
import GroupDashboard from '../components/GroupDashboard';
import { useAuth } from '../context/AuthContext';

interface TravelGroup {
    id: string;
    name: string;
    inviteCode?: string;
    members: any[];
    ownerId: number;
    isEngineReady: boolean;
    avatars: string[];
    shortlist?: any[];
}

const CodeBadge = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy Invite Code"
            className="mt-2 flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
        >
            <span className="font-mono text-xs font-semibold tracking-wider">
                {code}
            </span>
            {copied ? (
                <Check size={12} className="text-emerald-400" />
            ) : (
                <Copy size={12} />
            )}
        </button>
    );
};

export const TravelGroupsPage = () => {
    const [showCreate, setShowCreate] = useState(false);
    const [showJoin, setShowJoin] = useState(false);

    const [newGroupName, setNewGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');

    const [groups, setGroups] = useState<TravelGroup[]>(() => {
        const saved = localStorage.getItem('workspaces');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        }
        return [];
    });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<TravelGroup | null>(null);

    const { user: currentUser } = useAuth();

    // Persist groups to localStorage whenever they change
    useEffect(() => {
        if (Array.isArray(groups)) {
            localStorage.setItem('workspaces', JSON.stringify(groups));
        }
    }, [groups]);
    const fetchGroups = async () => {
        try {
            setLoading(true);
            const response = await routiqApi.get('/groups');

            if (response.data && Array.isArray(response.data)) {
                setGroups(response.data);
            }
            setError(null);
        } catch (err: any) {
            console.error('Failed to fetch groups', err);
            // If 401, the token is invalid — clear stale cache to prevent ghost groups
            if (err?.response?.status === 401) {
                setGroups([]);
                localStorage.removeItem('workspaces');
                setError('Session expired. Please log in again.');
            } else if (!Array.isArray(groups) || groups.length === 0) {
                setError('Could not connect to server. Start backend: dotnet run');
            }
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when auth state changes (ensures we fetch AFTER token is set)
    useEffect(() => {
        if (currentUser?.id) {
            fetchGroups();
        }
    }, [currentUser?.id]);

    const handleJoinCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 3) {
            val = val.slice(0, 3) + '-' + val.slice(3, 7);
        }
        setJoinCode(val.slice(0, 8));
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            setActionLoading(true);
            await routiqApi.post('/groups', { name: newGroupName });
            setNewGroupName('');
            setShowCreate(false);
            fetchGroups();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create workspace.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleJoinGroup = async () => {
        if (!joinCode.trim() || joinCode.length < 8) return;
        try {
            setActionLoading(true);
            await routiqApi.post('/groups/join', { inviteCode: joinCode });
            setJoinCode('');
            setShowJoin(false);
            fetchGroups();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to join workspace.');
        } finally {
            setActionLoading(false);
        }
    };

    const deleteGroup = async (groupId: string) => {
        setGroups(prev => {
            if (!Array.isArray(prev)) return [];
            return prev.filter(g => g.id !== groupId);
        });
        try {
            await routiqApi.delete(`/groups/${groupId}`);
        } catch (err) {
            console.error('Failed to delete group', err);
            fetchGroups();
        }
    };

    if (selectedGroup) {
        return (
            <GroupDashboard
                allGroups={groups}
                selectedGroupId={selectedGroup.id}
                onBack={() => setSelectedGroup(null)}
                deleteGroup={deleteGroup}
                currentUser={currentUser}
            />
        );
    }

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
            >
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
                            <Users size={20} className="text-teal-600 dark:text-teal-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Travel Groups
                        </h1>
                    </div>
                    <p className="text-base text-gray-500 dark:text-gray-400 max-w-xl">
                        A collaborative workspace to plan trips with friends. Invite members and let the intersection engine find flights that work for everyone.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
                        className="flex items-center gap-2"
                    >
                        <KeyRound size={18} />
                        Join with Code
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
                        className="flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Create New Group
                    </Button>
                </div>
            </motion.div>

            {/* Inline Forms for Create / Join */}
            <AnimatePresence mode="wait">
                {showCreate && (
                    <motion.div
                        key="create-form"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="border-teal-100 dark:border-teal-900/30 bg-teal-50/30 dark:bg-teal-900/10 p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
                            <div className="flex-1 w-full">
                                <Input
                                    label="Workspace Name"
                                    placeholder="e.g. Balkan Trip 2026"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button
                                className="w-full md:w-auto"
                                onClick={handleCreateGroup}
                                disabled={actionLoading || !newGroupName.trim()}
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Create Workspace'}
                            </Button>
                        </Card>
                    </motion.div>
                )}

                {showJoin && (
                    <motion.div
                        key="join-form"
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="border-gray-200 dark:border-gray-700/50 p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex-1 w-full">
                                <Input
                                    label="Workspace Invite Code"
                                    placeholder="RTQ-XXXX"
                                    value={joinCode}
                                    onChange={handleJoinCodeChange}
                                    maxLength={8}
                                    autoFocus
                                />
                            </div>
                            <Button
                                variant="primary"
                                className="w-full md:w-auto"
                                onClick={handleJoinGroup}
                                disabled={actionLoading || joinCode.length < 8}
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Join Workspace'}
                            </Button>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* My Groups Grid */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Map size={20} className="text-gray-400" />
                    My Workspaces
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading && (!Array.isArray(groups) || groups.length === 0) ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500">
                            <Loader2 size={32} className="animate-spin text-teal-500 mb-4" />
                            <p>Loading workspaces...</p>
                        </div>
                    ) : error && (!Array.isArray(groups) || groups.length === 0) ? (
                        <div className="col-span-full py-12 text-center text-red-500">
                            <p>{error}</p>
                        </div>
                    ) : !Array.isArray(groups) || groups.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                            <p>You haven't joined any workspaces yet.</p>
                        </div>
                    ) : (
                        Array.isArray(groups) ? groups.map((group: TravelGroup, idx: number) => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                className="h-full"
                            >
                                <Card hoverEffect className="h-full flex flex-col relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                {group.name}
                                            </h3>
                                            {group.inviteCode && <CodeBadge code={group.inviteCode} />}
                                        </div>
                                        {group.isEngineReady ? (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                                                <Zap size={12} className="fill-emerald-500 dark:fill-emerald-400" />
                                                <span>Engine Ready</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium border border-gray-200 dark:border-gray-700 shrink-0">
                                                <span>Draft</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-6 mt-2">
                                            <div className="flex items-center">
                                                {group.members.slice(0, 5).map((member: any, i: number) => {
                                                    const avatarSrc = member.avatar || member.avatarUrl;
                                                    const solvedUrl = avatarSrc
                                                        || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'User')}&background=random&color=fff`;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 -ml-2 first:ml-0 overflow-hidden bg-gray-200 dark:bg-gray-700 hover:z-20 transition-transform hover:scale-110"
                                                            style={{ zIndex: 10 - i }}
                                                            title={member.name}
                                                        >
                                                            <img src={solvedUrl} alt={member.name} className="w-full h-full object-cover" />
                                                        </div>
                                                    );
                                                })}
                                                {group.members.length > 5 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 -ml-2 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 z-0">
                                                        +{group.members.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                {group.members.length} members
                                            </span>
                                        </div>
                                    </div>

                                    <Button variant="outline" className="w-full flex items-center justify-between group/btn" onClick={() => setSelectedGroup(group)}>
                                        <span>Open Dashboard</span>
                                        <ChevronRight size={16} className="text-gray-400 group-hover/btn:text-gray-700 dark:group-hover/btn:text-gray-200 transition-colors" />
                                    </Button>
                                </Card>
                            </motion.div>
                        )) : <p>No groups available</p>
                    )}
                </div>
            </div>
        </main>
    );
};
