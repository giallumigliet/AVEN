import Foundation
import HealthKit

final class HealthManager {

    private let healthStore = HKHealthStore()

    // MARK: - HealthKit availability
    var isAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    // MARK: - HealthKit types
    private var stepType: HKQuantityType? {
        HKQuantityType.quantityType(
            forIdentifier: .stepCount
        )}

    private var distanceType: HKQuantityType? {
        HKQuantityType.quantityType(
            forIdentifier: .distanceWalkingRunning
        )}

    // MARK: - Request permission
    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthError.notAvailable
        }

        guard let stepType, let distanceType else {
            throw HealthError.typesUnavailable
        }

        let readTypes: Set<HKObjectType> = [stepType, distanceType]

        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
    }

    // MARK: - Today's data
    func getToday() async throws -> HealthData {
        guard HKHealthStore.isHealthDataAvailable() else {
            throw HealthError.notAvailable
        }

        guard let stepType, let distanceType else {
            throw HealthError.typesUnavailable
        }

        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay( for: Date() )

        let endOfDay = calendar.date(
            byAdding: .day,
            value: 1,
            to: startOfDay
        )!

        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: endOfDay,
            options: .strictStartDate
        )

        async let steps = calculateSum(
            type: stepType,
            unit: HKUnit.count(),
            predicate: predicate
        )

        async let distanceMeters = calculateSum(
            type: distanceType,
            unit: HKUnit.meter(),
            predicate: predicate
        )

        let resultSteps = try await steps
        let resultDistance = try await distanceMeters

        return HealthData(
            steps: Int(resultSteps),
            distanceKm: resultDistance / 1000.0,
            date: dateString(from: Date())
        )
    }

    // MARK: - Query helper
    private func calculateSum(
        type: HKQuantityType,
        unit: HKUnit,
        predicate: NSPredicate
    ) async throws -> Double {

        try await withCheckedThrowingContinuation { continuation in

            let query = HKStatisticsQuery(
                quantityType: type,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, error in

                if let error {
                    continuation.resume( throwing: error )
                    return
                }

                let value = statistics?
                    .sumQuantity()?
                    .doubleValue(for: unit) ?? 0

                continuation.resume( returning: value )
            }

            healthStore.execute(query)
        }
    }

    // MARK: - Date
    private func dateString(from date: Date) -> String {

        let formatter = DateFormatter()

        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"

        return formatter.string(from: date)
    }
}

// MARK: - Data model
struct HealthData {
    let steps: Int
    let distanceKm: Double
    let date: String
}

// MARK: - Errors
enum HealthError: LocalizedError {
    case notAvailable
    case typesUnavailable

    var errorDescription: String? {

        switch self {

        case .notAvailable:
            return "HealthKit non è disponibile su questo dispositivo."

        case .typesUnavailable:
            return "I dati HealthKit richiesti non sono disponibili."
        }
    }
}
