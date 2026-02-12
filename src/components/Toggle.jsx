export default function Toggle({ checked, onChange, color = 'green' }) {
  const colorClass = color === 'yellow' ? 'peer-checked:bg-yellow-600' : 'peer-checked:bg-green-600';

  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className={`w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${colorClass}`}></div>
    </label>
  );
}
