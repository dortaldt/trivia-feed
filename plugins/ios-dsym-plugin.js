const { withXcodeProject } = require('@expo/config-plugins');

const withiOSdSYMPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    
    // Get all build configurations
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    // Set dSYM generation settings for all configurations
    for (const key in configurations) {
      const buildConfig = configurations[key];
      if (buildConfig.buildSettings) {
        // Ensure debug symbols are generated
        buildConfig.buildSettings.DEBUG_INFORMATION_FORMAT = 'dwarf-with-dsym';
        buildConfig.buildSettings.ONLY_ACTIVE_ARCH = 'NO';
        
        // For Release builds, ensure symbols are stripped but dSYM is generated
        if (buildConfig.name === 'Release') {
          buildConfig.buildSettings.STRIP_INSTALLED_PRODUCT = 'YES';
          buildConfig.buildSettings.SEPARATE_STRIP = 'YES';
          buildConfig.buildSettings.STRIP_STYLE = 'debugging';
        }
      }
    }
    
    return config;
  });
};

module.exports = withiOSdSYMPlugin; 