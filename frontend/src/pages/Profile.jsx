import { useState, useEffect } from 'react';
import useAxios from '../hooks/useAxios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Mail, Briefcase, Shield, Key, Check, X } from 'lucide-react';

const Profile = () => {
  const { user: authUser } = useAuth();
  const api = useAxios();
  const { showNotification } = useNotification();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/api/profile');
        const userData = response.data?.data?.user || response.data?.data || response.data;
        setProfileData(userData);
      } catch (error) {
        console.error("Failed to load profile details", error);
        setProfileData(authUser);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [api, authUser]);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  // ==========================================
  // PASSWORD STRENGTH LOGIC
  // ==========================================
  const checkRequirements = (pwd) => ({
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd)
  });

  const reqs = checkRequirements(passwords.newPassword);
  const score = Object.values(reqs).filter(Boolean).length;
  
  let strengthColor = "bg-gray-200 dark:bg-gray-700";
  let strengthWidth = "w-0";
  let strengthLabel = "";

  if (passwords.newPassword.length > 0) {
    if (score <= 2) {
      strengthColor = "bg-red-500";
      strengthWidth = "w-1/3";
      strengthLabel = "Weak";
    } else if (score <= 4) {
      strengthColor = "bg-amber-500";
      strengthWidth = "w-2/3";
      strengthLabel = "Fair";
    } else {
      strengthColor = "bg-emerald-500";
      strengthWidth = "w-full";
      strengthLabel = "Strong";
    }
  }

  // Helper component for the checklist items
  const RequirementItem = ({ met, text }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
      {met ? <Check size={14} className="stroke-2" /> : <X size={14} className="stroke-2" />}
      <span>{text}</span>
    </div>
  );

  // ==========================================
  // FORM SUBMISSION
  // ==========================================
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmNewPassword) {
      return showNotification("New passwords do not match!", "error");
    }

    if (score < 5) {
      return showNotification("Please ensure your new password meets all security requirements.", "error");
    }

    setIsSubmitting(true);
    try {
      await api.patch('/api/profile/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
        confirmPassword: passwords.confirmNewPassword 
      });

      showNotification("Password updated successfully!", "success");
      setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (error) {
      const validationErrors = error.response?.data?.errors;
      if (validationErrors && validationErrors.length > 0) {
        showNotification(validationErrors[0].message, "error");
      } else {
        const msg = error.response?.data?.message || "Failed to update password.";
        showNotification(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${first}${last}` || '?';
  };

  const displayUser = profileData || authUser || {};

  // ==========================================
  // SKELETON LOADER
  // ==========================================
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div>
          <div className="h-9 w-64 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2"></div>
          <div className="h-4 w-96 max-w-full bg-gray-100 dark:bg-gray-800/50 rounded-lg"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column Skeleton */}
          <div className="lg:col-span-1 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden h-fit">
            <div className="h-28 bg-gray-200 dark:bg-gray-700"></div>
            <div className="px-6 pb-6 relative">
              <div className="flex justify-center -mt-12 mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1d27] bg-gray-300 dark:bg-gray-600"></div>
              </div>
              <div className="text-center mb-6 space-y-2">
                <div className="h-5 w-36 bg-gray-200 dark:bg-gray-700 rounded mx-auto"></div>
                <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded mx-auto"></div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-11 w-full bg-gray-100 dark:bg-[#13151c] rounded-lg border border-gray-200 dark:border-gray-700"></div>
              </div>
            ))}
            <div className="pt-4">
              <div className="h-10 w-44 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile details and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile Details Card */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden h-fit">
          <div className="h-28 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          
          <div className="px-6 pb-6 relative">
            <div className="flex justify-center -mt-12 mb-4">
              {displayUser.profilePicture ? (
                <img 
                  src={displayUser.profilePicture} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1d27] object-cover bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#1a1d27] bg-gray-800 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {getInitials(displayUser.firstName, displayUser.lastName)}
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {displayUser.firstName} {displayUser.lastName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                ID: {displayUser.employeeId || displayUser.id?.substring(0, 8) || 'N/A'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                  <Shield size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Role</p>
                  <p className="font-medium text-gray-900 dark:text-white">{displayUser.role || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                  <Mail size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white truncate">{displayUser.email || 'No email provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
                  <Briefcase size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">Department</p>
                  <p className="font-medium text-gray-900 dark:text-white">{displayUser.department || 'Unassigned Department'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Update Password Card */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1d27] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6 text-gray-900 dark:text-white">
            <Key size={20} className="text-indigo-500" />
            <h2 className="text-lg font-bold">Update Password</h2>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                required
                value={passwords.currentPassword}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                name="newPassword"
                required
                value={passwords.newPassword}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Enter new password"
              />
              
              {/* PASSWORD STRENGTH METER */}
              {passwords.newPassword.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-[#13151c] border border-gray-100 dark:border-gray-800 rounded-xl transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Security Strength
                    </span>
                    <span className={`text-xs font-bold ${
                      score === 5 ? 'text-emerald-500' : score > 2 ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {strengthLabel}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                    <div className={`h-full ${strengthColor} ${strengthWidth} transition-all duration-300`}></div>
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2">
                    <RequirementItem met={reqs.length} text="At least 8 characters" />
                    <RequirementItem met={reqs.uppercase} text="One uppercase letter" />
                    <RequirementItem met={reqs.lowercase} text="One lowercase letter" />
                    <RequirementItem met={reqs.number} text="One number" />
                    <RequirementItem met={reqs.special} text="One special character" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                name="confirmNewPassword"
                required
                value={passwords.confirmNewPassword}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 dark:bg-[#13151c] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Confirm new password"
              />
              {/* Live Match Indicator */}
              {passwords.confirmNewPassword.length > 0 && (
                <p className={`text-xs mt-1.5 font-medium ${
                  passwords.newPassword === passwords.confirmNewPassword ? 'text-emerald-500' : 'text-red-500'
                }`}>
                  {passwords.newPassword === passwords.confirmNewPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting || (passwords.newPassword.length > 0 && score < 5)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:bg-indigo-400 disabled:dark:bg-indigo-800 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmitting ? 'Updating...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Profile;