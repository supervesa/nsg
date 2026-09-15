import React from 'react';
import * as LucideIcons from 'lucide-react';

export default function LaunchCard({ 
  title, 
  description, 
  iconName, 
  buttonText, 
  onLaunch, 
  isGenerating, 
  error 
}) {
  const Icon = LucideIcons[iconName] || LucideIcons.Rocket;

  return (
    <div className="ui-panel flex flex-col h-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-black text-white rounded-md">
          <Icon size={24} />
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-6 flex-grow">
        {description}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm border-l-4 border-red-500">
          {error}
        </div>
      )}

      <button 
        onClick={onLaunch} 
        disabled={isGenerating}
        className={`w-full py-3 px-4 rounded text-white font-bold transition-all flex items-center justify-center gap-2 ${
          isGenerating 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-black hover:bg-gray-800 shadow-md hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        {isGenerating ? (
          <>
            <LucideIcons.Loader2 className="animate-spin" size={18} /> 
            Muodostetaan turvayhteyttä...
          </>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}