import { AssetCodeConfigModel } from './asset-code.model.js';

export interface GenerateAssetCodeOptions {
  branchCode: string;
  categoryCode: string;
  propertyTypeCode?: string;
}

export class AssetCodeService {
  /**
   * Generates a unique, sequential, configurable asset code using atomic $inc.
   * Template tokens: {PREFIX}, {BRANCH}, {CAT}, {PROP_TYPE}, {YYYY}, {MM}, {SEQ:N}
   */
  async generateCode(options: GenerateAssetCodeOptions): Promise<string> {
    const config = await AssetCodeConfigModel.findOneAndUpdate(
      { scope: 'global', isActive: true },
      { $inc: { currentSequence: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    let template = config.formatTemplate || '{PREFIX}-{BRANCH}-{CAT}-{YYYY}-{SEQ:5}';

    // Replace tokens
    template = template.replace(/{PREFIX}/g, config.prefix || 'AM');
    template = template.replace(/{BRANCH}/g, (options.branchCode || 'HQ').toUpperCase());
    template = template.replace(/{CAT}/g, (options.categoryCode || 'GEN').toUpperCase());
    template = template.replace(
      /{PROP_TYPE}/g,
      (options.propertyTypeCode || options.categoryCode || 'AST').toUpperCase(),
    );
    template = template.replace(/{YYYY}/g, yyyy);
    template = template.replace(/{MM}/g, mm);

    // Sequence token: {SEQ:N}
    const seqMatch = template.match(/{SEQ:(\d+)}/);
    if (seqMatch) {
      const padding = parseInt(seqMatch[1] || '5', 10);
      const seqStr = String(config.currentSequence).padStart(padding, '0');
      template = template.replace(/{SEQ:\d+}/g, seqStr);
    } else {
      template = `${template}-${config.currentSequence}`;
    }

    return template;
  }

  /**
   * Updates global or category-scoped asset code configuration (master data config).
   */
  async updateConfig(params: {
    prefix?: string;
    formatTemplate?: string;
  }) {
    return AssetCodeConfigModel.findOneAndUpdate(
      { scope: 'global' },
      { $set: params, $inc: { version: 1 } },
      { new: true, upsert: true },
    );
  }

  /**
   * Retrieves active asset code configuration.
   */
  async getConfig() {
    let config = await AssetCodeConfigModel.findOne({ scope: 'global' });
    if (!config) {
      config = await AssetCodeConfigModel.create({
        prefix: 'AM',
        formatTemplate: '{PREFIX}-{BRANCH}-{CAT}-{YYYY}-{SEQ:5}',
        scope: 'global',
        currentSequence: 0,
        isActive: true,
        version: 1,
      });
    }
    return config;
  }
}

export const assetCodeService = new AssetCodeService();
