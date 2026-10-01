import { useState } from "react";
import {
  FiChevronDown,
  FiChevronUp,
  FiHome,
  FiTruck,
  FiCoffee,
  FiActivity,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import {
  emptyActivity,
  emptyHotel,
  emptyTransport,
  emptyMeal,
  formatDate,
} from "../../utils/itineraryUtils";

// =====================================================
// SHARED FORM PRIMITIVES
// =====================================================

export function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="block text-xs font-medium text-gray-600 mb-1.5">
      {children}

      {required && (
        <span className="text-red-500 ml-1">
          *
        </span>
      )}
    </label>
  );
}

export function Input({
  className = "",
  ...props
}) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 ${className}`}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${className}`}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className = "",
  ...props
}) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-400 resize-none ${className}`}
    />
  );
}

// =====================================================
// LIST EDITOR
// =====================================================

export function ListEditor({
  label,
  values,
  onChange,
  placeholder,
}) {
  const [
    value,
    setValue,
  ] = useState("");

  const addItem = () => {
    const clean =
      value.trim();

    if (!clean) return;

    onChange([
      ...values,
      clean,
    ]);

    setValue("");
  };

  return (
    <div>
      <FieldLabel>
        {label}
      </FieldLabel>

      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          placeholder={
            placeholder
          }
          onKeyDown={(e) => {
            if (
              e.key ===
              "Enter"
            ) {
              e.preventDefault();
              addItem();
            }
          }}
        />

        <button
          type="button"
          onClick={addItem}
          className="px-3 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
        >
          Add
        </button>
      </div>

      {values.length >
        0 && (
        <div className="mt-2 space-y-1.5">
          {values.map(
            (
              item,
              index
            ) => (
              <div
                key={`${item}-${index}`}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100"
              >
                <span className="text-xs text-gray-700">
                  {item}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      values.filter(
                        (
                          _,
                          itemIndex
                        ) =>
                          itemIndex !==
                          index
                      )
                    )
                  }
                  className="text-gray-400 hover:text-red-500"
                >
                  <FiX
                    size={14}
                  />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// =====================================================
// DAY EDITOR
// =====================================================

export function DayEditor({
  day,
  index,
  onChange,
  hotels,
  transports,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(
    index === 0
  );

  // ===================================================
  // BASIC DAY UPDATE
  // ===================================================

  const updateDay = (
    field,
    value
  ) =>
    onChange({
      ...day,
      [field]: value,
    });

  // ===================================================
  // HOTEL
  // ===================================================

  const updateHotel = (
    field,
    value
  ) => {
    onChange({
      ...day,

      hotel: {
        ...(day.hotel ||
          emptyHotel),

        [field]: value,
      },
    });
  };

  // ===================================================
  // ACTIVITIES
  // ===================================================

  const addActivity =
    () =>
      updateDay(
        "activities",
        [
          ...(day.activities ||
            []),

          {
            ...emptyActivity,
          },
        ]
      );

  const updateActivity = (
    activityIndex,
    field,
    value
  ) => {
    const activities = [
      ...(day.activities ||
        []),
    ];

    activities[
      activityIndex
    ] = {
      ...activities[
        activityIndex
      ],

      [field]: value,
    };

    updateDay(
      "activities",
      activities
    );
  };

  const removeActivity =
    (
      activityIndex
    ) =>
      updateDay(
        "activities",
        (
          day.activities ||
          []
        ).filter(
          (_, i) =>
            i !==
            activityIndex
        )
      );

  // ===================================================
  // TRANSPORT
  // ===================================================

  const addTransport =
    () =>
      updateDay(
        "transport",
        [
          ...(day.transport ||
            []),

          {
            ...emptyTransport,
          },
        ]
      );

  const updateTransport = (
    transportIndex,
    field,
    value
  ) => {
    const transport = [
      ...(day.transport ||
        []),
    ];

    transport[
      transportIndex
    ] = {
      ...transport[
        transportIndex
      ],

      [field]: value,
    };

    updateDay(
      "transport",
      transport
    );
  };

  const removeTransport =
    (
      transportIndex
    ) =>
      updateDay(
        "transport",
        (
          day.transport ||
          []
        ).filter(
          (_, i) =>
            i !==
            transportIndex
        )
      );

  // ===================================================
  // MEALS
  // ===================================================

  const addMeal =
    () =>
      updateDay(
        "meals",
        [
          ...(day.meals ||
            []),

          {
            ...emptyMeal,
          },
        ]
      );

  const updateMeal = (
    mealIndex,
    field,
    value
  ) => {
    const meals = [
      ...(day.meals ||
        []),
    ];

    meals[
      mealIndex
    ] = {
      ...meals[
        mealIndex
      ],

      [field]: value,
    };

    updateDay(
      "meals",
      meals
    );
  };

  const removeMeal =
    (mealIndex) =>
      updateDay(
        "meals",
        (
          day.meals ||
          []
        ).filter(
          (_, i) =>
            i !==
            mealIndex
        )
      );

  // ===================================================
  // UI
  // ===================================================

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">

      {/* DAY HEADER */}

      <button
        type="button"
        onClick={() =>
          setExpanded(
            (value) =>
              !value
          )
        }
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 bg-gray-50/70 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">

          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">
            D
            {
              day.dayNumber
            }
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-800">
              {day.title ||
                `Day ${day.dayNumber}`}
            </p>

            <p className="text-[11px] text-gray-400 mt-0.5">
              {day.date
                ? formatDate(
                    day.date
                  )
                : "Date not selected"}

              {day.city
                ? ` • ${day.city}`
                : ""}
            </p>
          </div>
        </div>

        {expanded ? (
          <FiChevronUp />
        ) : (
          <FiChevronDown />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-5">

          {/* =================================================
              BASIC DAY INFORMATION
          ================================================= */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <div>
              <FieldLabel>
                Date
              </FieldLabel>

              <Input
                type="date"
                value={
                  day.date ||
                  ""
                }
                onChange={(e) =>
                  updateDay(
                    "date",
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <FieldLabel>
                Day title
              </FieldLabel>

              <Input
                value={
                  day.title ||
                  ""
                }
                onChange={(e) =>
                  updateDay(
                    "title",
                    e.target.value
                  )
                }
                placeholder="Arrival in Manali"
              />
            </div>

            <div>
              <FieldLabel>
                City
              </FieldLabel>

              <Input
                value={
                  day.city ||
                  ""
                }
                onChange={(e) =>
                  updateDay(
                    "city",
                    e.target.value
                  )
                }
                placeholder="Manali"
              />
            </div>

          </div>

          {/* LOCATION */}

          <div>
            <FieldLabel>
              Location
            </FieldLabel>

            <Input
              value={
                day.location ||
                ""
              }
              onChange={(e) =>
                updateDay(
                  "location",
                  e.target.value
                )
              }
              placeholder="Hotel / landmark / meeting point"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <FieldLabel>
              Description
            </FieldLabel>

            <Textarea
              rows={3}
              value={
                day.description ||
                ""
              }
              onChange={(e) =>
                updateDay(
                  "description",
                  e.target.value
                )
              }
              placeholder="Describe the day's plan..."
            />
          </div>

          {/* =================================================
              ACTIVITIES
          ================================================= */}

          <div className="border-t border-gray-100 pt-4">

            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-2">
                <FiActivity className="text-blue-500" />

                <h4 className="text-sm font-semibold text-gray-800">
                  Activities
                </h4>
              </div>

              <button
                type="button"
                onClick={
                  addActivity
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                + Add Activity
              </button>

            </div>

            <div className="space-y-3">

              {(
                day.activities ||
                []
              ).map(
                (
                  activity,
                  activityIndex
                ) => (
                  <div
                    key={
                      activityIndex
                    }
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/50"
                  >

                    <div className="flex justify-between items-center mb-3">

                      <span className="text-xs font-semibold text-gray-600">
                        Activity{" "}
                        {activityIndex +
                          1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeActivity(
                            activityIndex
                          )
                        }
                        className="text-gray-400 hover:text-red-500"
                      >
                        <FiTrash2
                          size={14}
                        />
                      </button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      {/* NAME */}

                      <div>
                        <FieldLabel>
                          Name
                        </FieldLabel>

                        <Input
                          value={
                            activity.name ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "name",
                              e.target
                                .value
                            )
                          }
                          placeholder="Solang Valley Sightseeing"
                        />
                      </div>

                      {/* LOCATION */}

                      <div>
                        <FieldLabel>
                          Location
                        </FieldLabel>

                        <Input
                          value={
                            activity.location ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "location",
                              e.target
                                .value
                            )
                          }
                          placeholder="Solang Valley"
                        />
                      </div>

                      {/* START TIME */}

                      <div>
                        <FieldLabel>
                          Start time
                        </FieldLabel>

                        <Input
                          type="time"
                          value={
                            activity.startTime ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "startTime",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                      {/* END TIME */}

                      <div>
                        <FieldLabel>
                          End time
                        </FieldLabel>

                        <Input
                          type="time"
                          value={
                            activity.endTime ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "endTime",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                      {/* DURATION */}

                      <div>
                        <FieldLabel>
                          Duration
                        </FieldLabel>

                        <Input
                          value={
                            activity.duration ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "duration",
                              e.target
                                .value
                            )
                          }
                          placeholder="3 hours"
                        />
                      </div>

                      {/* AMOUNT */}

                      <div>
                        <FieldLabel>
                          Amount
                        </FieldLabel>

                        <Input
                          type="number"
                          min="0"
                          value={
                            activity.amount ??
                            0
                          }
                          onChange={(
                            e
                          ) =>
                            updateActivity(
                              activityIndex,
                              "amount",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                    </div>

                    {/* DESCRIPTION */}

                    <div className="mt-3">

                      <FieldLabel>
                        Description
                      </FieldLabel>

                      <Textarea
                        rows={2}
                        value={
                          activity.description ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateActivity(
                            activityIndex,
                            "description",
                            e.target
                              .value
                          )
                        }
                      />

                    </div>

                    {/* NOTES */}

                    <div className="mt-3">

                      <FieldLabel>
                        Notes
                      </FieldLabel>

                      <Textarea
                        rows={2}
                        value={
                          activity.notes ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateActivity(
                            activityIndex,
                            "notes",
                            e.target
                              .value
                          )
                        }
                      />

                    </div>

                    {/* INCLUDED */}

                    <label className="flex items-center gap-2 mt-3 text-xs text-gray-600">

                      <input
                        type="checkbox"
                        checked={
                          activity.included !==
                          false
                        }
                        onChange={(
                          e
                        ) =>
                          updateActivity(
                            activityIndex,
                            "included",
                            e.target
                              .checked
                          )
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      Included in itinerary

                    </label>

                  </div>
                )
              )}

              {(
                day.activities ||
                []
              ).length ===
                0 && (
                <div className="py-5 text-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                  No activities added for this day.
                </div>
              )}

            </div>
          </div>

          {/* =================================================
              HOTEL
          ================================================= */}

          <div className="border-t border-gray-100 pt-4">

            <div className="flex items-center gap-2 mb-3">

              <FiHome className="text-emerald-500" />

              <h4 className="text-sm font-semibold text-gray-800">
                Hotel
              </h4>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* HOTEL */}

              <div>
                <FieldLabel>
                  Hotel
                </FieldLabel>

                <Select
                  value={
                    day.hotel
                      ?.hotel || ""
                  }
                  onChange={(e) =>
                    updateHotel(
                      "hotel",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select hotel
                  </option>

                  {hotels.map(
                    (hotel) => (
                      <option
                        key={
                          hotel._id
                        }
                        value={
                          hotel._id
                        }
                      >
                        {hotel.name ||
                          hotel.hotelName ||
                          "Unnamed Hotel"}
                      </option>
                    )
                  )}

                </Select>
              </div>

              {/* ROOM TYPE */}

              <div>
                <FieldLabel>
                  Room type
                </FieldLabel>

                <Input
                  value={
                    day.hotel
                      ?.roomType ||
                    ""
                  }
                  onChange={(e) =>
                    updateHotel(
                      "roomType",
                      e.target.value
                    )
                  }
                  placeholder="Deluxe Room"
                />
              </div>

              {/* CHECK IN */}

              <div>
                <FieldLabel>
                  Check-in
                </FieldLabel>

                <Input
                  type="date"
                  value={
                    day.hotel
                      ?.checkIn ||
                    ""
                  }
                  onChange={(e) =>
                    updateHotel(
                      "checkIn",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* CHECK OUT */}

              <div>
                <FieldLabel>
                  Check-out
                </FieldLabel>

                <Input
                  type="date"
                  value={
                    day.hotel
                      ?.checkOut ||
                    ""
                  }
                  onChange={(e) =>
                    updateHotel(
                      "checkOut",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* NIGHTS */}

              <div>
                <FieldLabel>
                  Nights
                </FieldLabel>

                <Input
                  type="number"
                  min="0"
                  value={
                    day.hotel
                      ?.nights ??
                    0
                  }
                  onChange={(e) =>
                    updateHotel(
                      "nights",
                      e.target.value
                    )
                  }
                />
              </div>

              {/* NOTES */}

              <div>
                <FieldLabel>
                  Notes
                </FieldLabel>

                <Input
                  value={
                    day.hotel
                      ?.notes ||
                    ""
                  }
                  onChange={(e) =>
                    updateHotel(
                      "notes",
                      e.target.value
                    )
                  }
                  placeholder="Early check-in requested"
                />
              </div>

            </div>
          </div>

          {/* =================================================
              TRANSPORT
          ================================================= */}

          <div className="border-t border-gray-100 pt-4">

            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-2">

                <FiTruck className="text-orange-500" />

                <h4 className="text-sm font-semibold text-gray-800">
                  Transport
                </h4>

              </div>

              <button
                type="button"
                onClick={
                  addTransport
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100"
              >
                + Add Transport
              </button>

            </div>

            <div className="space-y-3">

              {(
                day.transport ||
                []
              ).map(
                (
                  item,
                  transportIndex
                ) => (
                  <div
                    key={
                      transportIndex
                    }
                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/50"
                  >

                    <div className="flex justify-between items-center mb-3">

                      <span className="text-xs font-semibold text-gray-600">
                        Transport{" "}
                        {transportIndex +
                          1}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          removeTransport(
                            transportIndex
                          )
                        }
                        className="text-gray-400 hover:text-red-500"
                      >
                        <FiTrash2
                          size={14}
                        />
                      </button>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                      {/* TRANSPORT RECORD */}

                      <div>
                        <FieldLabel>
                          Transport record
                        </FieldLabel>

                        <Select
                          value={
                            item.transport ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "transport",
                              e.target
                                .value
                            )
                          }
                        >

                          <option value="">
                            Select transport
                          </option>

                          {transports.map(
                            (
                              transport
                            ) => (
                              <option
                                key={
                                  transport._id
                                }
                                value={
                                  transport._id
                                }
                              >
                                {transport.name ||
                                  transport.vehicleNumber ||
                                  transport.type ||
                                  "Transport"}
                              </option>
                            )
                          )}

                        </Select>
                      </div>

                      {/* TYPE */}

                      <div>
                        <FieldLabel>
                          Type
                        </FieldLabel>

                        <Select
                          value={
                            item.type ||
                            "Private Cab"
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "type",
                              e.target
                                .value
                            )
                          }
                        >

                          <option>
                            Flight
                          </option>

                          <option>
                            Train
                          </option>

                          <option>
                            Bus
                          </option>

                          <option>
                            Private Cab
                          </option>

                          <option>
                            Rental Car
                          </option>

                          <option>
                            Cruise
                          </option>

                          <option>
                            Other
                          </option>

                        </Select>
                      </div>

                      {/* FROM */}

                      <div>
                        <FieldLabel>
                          From
                        </FieldLabel>

                        <Input
                          value={
                            item.from ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "from",
                              e.target
                                .value
                            )
                          }
                          placeholder="Delhi"
                        />
                      </div>

                      {/* TO */}

                      <div>
                        <FieldLabel>
                          To
                        </FieldLabel>

                        <Input
                          value={
                            item.to ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "to",
                              e.target
                                .value
                            )
                          }
                          placeholder="Agra"
                        />
                      </div>

                      {/* DEPARTURE */}

                      <div>
                        <FieldLabel>
                          Departure
                        </FieldLabel>

                        <Input
                          type="datetime-local"
                          value={
                            item.departureTime ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "departureTime",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                      {/* ARRIVAL */}

                      <div>
                        <FieldLabel>
                          Arrival
                        </FieldLabel>

                        <Input
                          type="datetime-local"
                          value={
                            item.arrivalTime ||
                            ""
                          }
                          onChange={(
                            e
                          ) =>
                            updateTransport(
                              transportIndex,
                              "arrivalTime",
                              e.target
                                .value
                            )
                          }
                        />
                      </div>

                    </div>

                    {/* NOTES */}

                    <div className="mt-3">

                      <FieldLabel>
                        Notes
                      </FieldLabel>

                      <Input
                        value={
                          item.notes ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateTransport(
                            transportIndex,
                            "notes",
                            e.target
                              .value
                          )
                        }
                      />

                    </div>

                  </div>
                )
              )}

              {(
                day.transport ||
                []
              ).length ===
                0 && (
                <div className="py-5 text-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                  No transport added for this day.
                </div>
              )}

            </div>
          </div>

          {/* =================================================
              MEALS
          ================================================= */}

          <div className="border-t border-gray-100 pt-4">

            <div className="flex items-center justify-between mb-3">

              <div className="flex items-center gap-2">

                <FiCoffee className="text-amber-500" />

                <h4 className="text-sm font-semibold text-gray-800">
                  Meals
                </h4>

              </div>

              <button
                type="button"
                onClick={
                  addMeal
                }
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
              >
                + Add Meal
              </button>

            </div>

            <div className="space-y-2">

              {(
                day.meals ||
                []
              ).map(
                (
                  meal,
                  mealIndex
                ) => (
                  <div
                    key={
                      mealIndex
                    }
                    className="p-3 border border-gray-200 rounded-xl bg-gray-50/50"
                  >

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">

                      {/* MEAL TYPE */}

                      <Select
                        value={
                          meal.type ||
                          "Breakfast"
                        }
                        onChange={(
                          e
                        ) =>
                          updateMeal(
                            mealIndex,
                            "type",
                            e.target
                              .value
                          )
                        }
                      >

                        <option>
                          Breakfast
                        </option>

                        <option>
                          Lunch
                        </option>

                        <option>
                          Dinner
                        </option>

                        <option>
                          Snacks
                        </option>

                        <option>
                          Other
                        </option>

                      </Select>

                      {/* RESTAURANT */}

                      <Input
                        value={
                          meal.restaurant ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateMeal(
                            mealIndex,
                            "restaurant",
                            e.target
                              .value
                          )
                        }
                        placeholder="Restaurant"
                      />

                      {/* NOTES */}

                      <Input
                        value={
                          meal.notes ||
                          ""
                        }
                        onChange={(
                          e
                        ) =>
                          updateMeal(
                            mealIndex,
                            "notes",
                            e.target
                              .value
                          )
                        }
                        placeholder="Notes"
                      />

                    </div>

                    <div className="flex items-center justify-between mt-3">

                      <label className="flex items-center gap-2 text-xs text-gray-600">

                        <input
                          type="checkbox"
                          checked={
                            meal.included !==
                            false
                          }
                          onChange={(
                            e
                          ) =>
                            updateMeal(
                              mealIndex,
                              "included",
                              e.target
                                .checked
                            )
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />

                        Included

                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          removeMeal(
                            mealIndex
                          )
                        }
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <FiTrash2
                          size={14}
                        />
                      </button>

                    </div>

                  </div>
                )
              )}

              {(
                day.meals ||
                []
              ).length ===
                0 && (
                <div className="py-5 text-center border border-dashed border-gray-200 rounded-xl text-xs text-gray-400">
                  No meals added for this day.
                </div>
              )}

            </div>
          </div>

          {/* =================================================
              FREE TIME + NOTES
          ================================================= */}

          <div className="border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">

            <div>
              <FieldLabel>
                Free time
              </FieldLabel>

              <Textarea
                rows={3}
                value={
                  day.freeTime ||
                  ""
                }
                onChange={(e) =>
                  updateDay(
                    "freeTime",
                    e.target.value
                  )
                }
                placeholder="Free time for shopping or relaxation..."
              />
            </div>

            <div>
              <FieldLabel>
                Day notes
              </FieldLabel>

              <Textarea
                rows={3}
                value={
                  day.notes ||
                  ""
                }
                onChange={(e) =>
                  updateDay(
                    "notes",
                    e.target.value
                  )
                }
                placeholder="Important notes for this day..."
              />
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default DayEditor;