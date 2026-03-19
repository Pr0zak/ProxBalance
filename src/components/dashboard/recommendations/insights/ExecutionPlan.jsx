import { List, ArrowRight } from '../../../Icons.jsx';

export default function ExecutionPlan({ recommendationData }) {
  const plan = recommendationData?.execution_plan;
  if (!plan?.ordered_recommendations?.length || plan.ordered_recommendations.length <= 1) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4">
        Execution plan shows the optimal order for running migrations when multiple are recommended. It identifies which migrations can run in parallel and which must be sequential to avoid conflicts. Only shown when there are 2+ recommendations.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">{plan.total_steps} steps</span>
        {plan.can_parallelize && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Parallel groups available</span>
        )}
      </div>
      <div className="space-y-1.5">
        {plan.ordered_recommendations.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
            <div className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
              {step.step}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                [{step.vmid}] {step.name}
              </span>
              <span className="text-gray-400 dark:text-gray-500 mx-1">{step.source_node}</span>
              <ArrowRight size={10} className="inline text-gray-400" />
              <span className="text-gray-400 dark:text-gray-500 mx-1">{step.target_node}</span>
            </div>
            {step.parallel_group !== undefined && (
              <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                Group {step.parallel_group + 1}
              </span>
            )}
            {step.reason_for_order && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[200px] truncate" title={step.reason_for_order}>
                {step.reason_for_order}
              </span>
            )}
          </div>
        ))}
        {plan.can_parallelize && plan.parallel_groups?.length > 0 && (
          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-2">
            Steps within the same group can run in parallel. Groups must execute sequentially.
          </div>
        )}
      </div>
    </div>
  );
}
