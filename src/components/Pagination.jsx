import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from './Icons.jsx';

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs sm:text-sm text-claude-muted dark:text-gray-400">
        Showing {startIndex}-{endIndex} of {totalItems}
      </div>
      <div className="flex items-center gap-1.5">
        {[
          { onClick: () => onPageChange(1), disabled: currentPage === 1, icon: ChevronsLeft, label: 'First' },
          { onClick: () => onPageChange(currentPage - 1), disabled: currentPage === 1, icon: ChevronLeft, label: 'Prev' },
        ].map(({ onClick, disabled, icon: Icon, label }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            className="px-2 sm:px-3 py-1.5 bg-gray-700/60 backdrop-blur border border-gray-600/50 rounded-xl text-xs sm:text-sm text-claude-text dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title={label}
          >
            <Icon size={14} className="sm:hidden" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <span className="text-xs sm:text-sm text-claude-text dark:text-gray-300 px-2 whitespace-nowrap">
          {currentPage} / {totalPages}
        </span>
        {[
          { onClick: () => onPageChange(currentPage + 1), disabled: currentPage === totalPages, icon: ChevronRight, label: 'Next' },
          { onClick: () => onPageChange(totalPages), disabled: currentPage === totalPages, icon: ChevronsRight, label: 'Last' },
        ].map(({ onClick, disabled, icon: Icon, label }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            className="px-2 sm:px-3 py-1.5 bg-gray-700/60 backdrop-blur border border-gray-600/50 rounded-xl text-xs sm:text-sm text-claude-text dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-700/80 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            title={label}
          >
            <Icon size={14} className="sm:hidden" /><span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
